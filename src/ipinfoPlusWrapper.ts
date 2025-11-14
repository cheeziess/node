import fetch from "node-fetch";
import type { RequestInit, Response } from "node-fetch";
import {
    defaultContinents,
    defaultCountriesCurrencies,
    defaultCountriesFlags,
    defaultCountries,
    defaultEuCountries
} from "../config/utils";
import Cache from "./cache/cache";
import LruCache from "./cache/lruCache";
import ApiLimitError from "./errors/apiLimitError";
import { isInSubnet } from "subnet-check";
import {
    REQUEST_TIMEOUT_DEFAULT,
    CACHE_VSN,
    HOST_PLUS,
    BOGON_NETWORKS,
    IPinfoPlus,
    IPBogon
} from "./common";
import VERSION from "./version";

const clientUserAgent = `IPinfoClient/nodejs/${VERSION}`;
const countryFlagURL = "https://cdn.ipinfo.io/static/images/countries-flags/";

export default class IPinfoPlusWrapper {
    private token: string;
    private baseUrl: string;
    private countries: any;
    private countriesFlags: any;
    private countriesCurrencies: any;
    private continents: any;
    private euCountries: Array<string>;
    private cache: Cache;
    private timeout: number;

    /**
     * Creates IPinfoPlusWrapper object to communicate with the IPinfo Plus API.
     *
     * @param token Token string provided by IPinfo for registered user.
     * @param cache An implementation of IPCache interface. If it is not provided
     * then LruCache is used as default.
     * @param timeout Timeout in milliseconds that controls the timeout of requests.
     * It defaults to 5000 i.e. 5 seconds. A timeout of 0 disables the timeout feature.
     * @param i18nData Internationalization data for customizing countries-related information.
     * @param i18nData.countries Custom countries data. If not provided, default countries data will be used.
     * @param i18nData.countriesFlags Custom countries flags data. If not provided, default countries flags data will be used.
     * @param i18nData.countriesCurrencies Custom countries currencies data. If not provided, default countries currencies data will be used.
     * @param i18nData.continents Custom continents data. If not provided, default continents data will be used.
     * @param i18nData.euCountries Custom EU countries data. If not provided or an empty array, default EU countries data will be used.
     */
    constructor(
        token: string,
        cache?: Cache,
        timeout?: number,
        i18nData?: {
            countries?: any;
            countriesFlags?: any;
            countriesCurrencies?: any;
            continents?: any;
            euCountries?: Array<string>;
        },
        baseUrl?: string
    ) {
        this.token = token;
        this.countries = i18nData?.countries
            ? i18nData.countries
            : defaultCountries;
        this.countriesFlags = i18nData?.countriesFlags
            ? i18nData.countriesFlags
            : defaultCountriesFlags;
        this.countriesCurrencies = i18nData?.countriesCurrencies
            ? i18nData.countriesCurrencies
            : defaultCountriesCurrencies;
        this.continents = i18nData?.continents
            ? i18nData.continents
            : defaultContinents;
        this.euCountries =
            i18nData?.euCountries && i18nData?.euCountries.length !== 0
                ? i18nData.euCountries
                : defaultEuCountries;
        this.cache = cache ? cache : new LruCache();
        this.timeout =
            timeout === null || timeout === undefined
                ? REQUEST_TIMEOUT_DEFAULT
                : timeout;
        this.baseUrl = baseUrl || `https://${HOST_PLUS}`;
    }

    public static cacheKey(k: string) {
        return `${k}:${CACHE_VSN}`;
    }

    public async fetchApi(
        path: string,
        init: RequestInit = {}
    ): Promise<Response> {
        const headers = {
            Accept: "application/json",
            Authorization: `Bearer ${this.token}`,
            "Content-Type": "application/json",
            "User-Agent": clientUserAgent
        };

        const request = Object.assign(
            {
                timeout: this.timeout,
                method: "GET",
                compress: false
            },
            init,
            { headers: Object.assign(headers, init.headers) }
        );

        const url = [this.baseUrl, path].join(
            !this.baseUrl.endsWith("/") && !path.startsWith("/") ? "/" : ""
        );

        return fetch(url, request).then((response: Response) => {
            if (response.status === 429) {
                throw new ApiLimitError();
            }

            if (response.status >= 400) {
                throw new Error(
                    `Received an error from the IPinfo API ` +
                        `(using authorization ${headers["Authorization"]}) ` +
                        `${response.status} ${response.statusText} ${response.url}`
                );
            }

            return response;
        });
    }

    /**
     * Lookup IP information using the IP.
     *
     * @param ip IP address against which the location information is required.
     * @return Response containing location information.
     */
    public async lookupIp(
        ip: string | undefined = undefined
    ): Promise<IPinfoPlus | IPBogon> {
        if (ip && this.isBogon(ip)) {
            return {
                ip,
                bogon: true
            };
        }

        if (!ip) {
            ip = "me";
        }

        const data = await this.cache.get(IPinfoPlusWrapper.cacheKey(ip));

        if (data) {
            return data;
        }

        return this.fetchApi(ip).then(async (response) => {
            const ipinfo = (await response.json()) as IPinfoPlus;

            // Format geo object
            const countryCode = ipinfo.geo.country_code;
            ipinfo.geo.country_name = this.countries[countryCode];
            ipinfo.geo.isEU = this.euCountries.includes(countryCode);
            ipinfo.geo.country_flag = this.countriesFlags[countryCode];
            ipinfo.geo.country_currency =
                this.countriesCurrencies[countryCode];
            ipinfo.geo.continent = this.continents[countryCode];
            ipinfo.geo.country_flag_url =
                countryFlagURL + countryCode + ".svg";

            this.cache.set(IPinfoPlusWrapper.cacheKey(ip), ipinfo);

            return ipinfo;
        });
    }

    private isBogon(ip: string): boolean {
        if (ip != "") {
            for (var network of BOGON_NETWORKS) {
                if (isInSubnet(ip, network)) {
                    return true;
                }
            }
        }
        return false;
    }
}
