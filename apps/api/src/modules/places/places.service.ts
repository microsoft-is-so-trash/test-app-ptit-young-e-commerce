import { Inject, Injectable, Logger, Optional, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../redis/redis.service';
import { billingMonth, defaultGoogleHttp, GOOGLE_HTTP, MONTHLY_COUNTER_TTL_SECONDS, requestGoogleJson, type GoogleHttp } from '../google/google-http';

/**
 * Gợi ý địa chỉ trạm cho admin bằng Places API (New), gọi qua backend (Q18). Mỗi SKU có bộ đếm
 * tháng riêng, tự dừng ở 8.000 lượt (mức miễn phí 10.000) — Q27. Không gọi được thì admin vẫn
 * nhập vĩ độ, kinh độ bằng tay.
 */
export const PLACES_AUTOCOMPLETE_URL = 'https://places.googleapis.com/v1/places:autocomplete';
export const PLACE_DETAILS_URL = 'https://places.googleapis.com/v1/places';
export const PLACE_DETAILS_FIELD_MASK = 'id,formattedAddress,location';
export const PLACES_MONTHLY_REQUEST_LIMIT = 8000;

export type PlacesSku = 'autocomplete' | 'details';

export interface PlaceSuggestion {
  place_id: string;
  text: string;
  main_text: string | null;
  secondary_text: string | null;
}

export interface PlaceLocation {
  place_id: string;
  address: string | null;
  lat: number;
  lng: number;
}

export function placesBudgetKey(sku: PlacesSku, now: Date): string {
  return `maps:places:${sku}:${billingMonth(now)}`;
}

function unavailable(): ServiceUnavailableException {
  return new ServiceUnavailableException({
    code: 'PLACES_UNAVAILABLE',
    message: 'Chưa tìm được địa chỉ lúc này. Hãy nhập vĩ độ, kinh độ bằng tay.',
    details: null,
  });
}

function textOf(value: unknown): string | null {
  const text = (value as { text?: unknown } | undefined)?.text;
  return typeof text === 'string' && text.trim() ? text : null;
}

@Injectable()
export class PlacesService {
  private readonly logger = new Logger(PlacesService.name);
  private readonly http: GoogleHttp;

  constructor(
    @Inject(ConfigService) private readonly config: ConfigService,
    @Inject(RedisService) private readonly redis: RedisService,
    @Optional() @Inject(GOOGLE_HTTP) http?: GoogleHttp,
  ) {
    this.http = http ?? defaultGoogleHttp;
  }

  async autocomplete(input: string, sessionToken: string): Promise<PlaceSuggestion[]> {
    const apiKey = await this.reserve('autocomplete');
    const body = await requestGoogleJson(this.http, this.logger, 'Places autocomplete', PLACES_AUTOCOMPLETE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': apiKey },
      body: JSON.stringify({ input, sessionToken, languageCode: 'vi', includedRegionCodes: ['vn'] }),
    });
    if (!body) throw unavailable();
    const suggestions = (body as { suggestions?: unknown }).suggestions;
    if (!Array.isArray(suggestions)) return [];
    return suggestions.flatMap((suggestion) => {
      const prediction = (suggestion as { placePrediction?: Record<string, unknown> }).placePrediction;
      const placeId = prediction?.placeId;
      const text = textOf(prediction?.text);
      if (typeof placeId !== 'string' || !text) return [];
      const format = prediction?.structuredFormat as { mainText?: unknown; secondaryText?: unknown } | undefined;
      return [{ place_id: placeId, text, main_text: textOf(format?.mainText), secondary_text: textOf(format?.secondaryText) }];
    });
  }

  async details(placeId: string, sessionToken: string): Promise<PlaceLocation> {
    const apiKey = await this.reserve('details');
    const query = new URLSearchParams({ sessionToken, languageCode: 'vi' });
    const body = await requestGoogleJson(this.http, this.logger, 'Place details', `${PLACE_DETAILS_URL}/${encodeURIComponent(placeId)}?${query}`, {
      method: 'GET',
      headers: { 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': PLACE_DETAILS_FIELD_MASK },
    });
    const place = body as { id?: unknown; formattedAddress?: unknown; location?: { latitude?: unknown; longitude?: unknown } } | null;
    const lat = place?.location?.latitude;
    const lng = place?.location?.longitude;
    if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng)) throw unavailable();
    return {
      place_id: typeof place?.id === 'string' ? place.id : placeId,
      address: typeof place?.formattedAddress === 'string' ? place.formattedAddress : null,
      lat,
      lng,
    };
  }

  /** Không có key, không có Redis (không đếm được hạn mức) hoặc hết hạn mức tháng thì không gọi Google. */
  private async reserve(sku: PlacesSku): Promise<string> {
    const apiKey = this.config.get<string>('GOOGLE_MAPS_SERVER_KEY')?.trim();
    if (!apiKey || !this.redis.isConfigured()) throw unavailable();
    const reserved = await this.redis
      .reserveWithinLimit(placesBudgetKey(sku, new Date()), 1, PLACES_MONTHLY_REQUEST_LIMIT, MONTHLY_COUNTER_TTL_SECONDS)
      .catch((error: unknown) => {
        this.logger.warn(`Places budget check failed: ${error instanceof Error ? error.message : String(error)}`);
        return false;
      });
    if (!reserved) throw unavailable();
    return apiKey;
  }
}
