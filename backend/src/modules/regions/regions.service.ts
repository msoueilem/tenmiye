import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

export interface Region {
  code: string;
  nameAr: string;
  nameEn: string;
}

// Top 5 most populous/well-known regions by state code (Nouakchott three + Brakna + Hodh Chargui)
const TOP_5_CODES = ['10', '11', '12', '04', '07'];

const ARABIC_NAMES: Record<string, string> = {
  'Adrar Region': 'منطقة آدرار',
  'Assaba Region': 'منطقة العصابة',
  'Brakna Region': 'منطقة البراكنة',
  'Dakhlet Nouadhibou': 'داخلة نواذيبو',
  'Gorgol Region': 'منطقة الكوركول',
  'Guidimaka Region': 'منطقة كيدي ماغا',
  'Hodh Ech Chargui Region': 'منطقة الحوض الشرقي',
  'Hodh El Gharbi Region': 'منطقة الحوض الغربي',
  'Inchiri Region': 'منطقة انشيري',
  'Nouakchott-Nord Region': 'نواكشوط الشمالية',
  'Nouakchott-Ouest Region': 'نواكشوط الغربية',
  'Nouakchott-Sud Region': 'نواكشوط الجنوبية',
  'Tagant Region': 'منطقة تكانت',
  'Tiris Zemmour Region': 'منطقة تيرس زمور',
  'Trarza Region': 'منطقة ترارزة',
};

@Injectable()
export class RegionsService implements OnModuleInit {
  private readonly logger = new Logger(RegionsService.name);
  private cache: Region[] = [];

  async onModuleInit() {
    await this.loadRegions();
  }

  private async loadRegions(): Promise<void> {
    try {
      const res = await fetch('https://countriesnow.space/api/v0.1/countries/states', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country: 'Mauritania' }),
      });

      const json = (await res.json()) as {
        data: { states: { name: string; state_code: string }[] };
      };

      this.cache = json.data.states.map((s) => ({
        code: s.state_code,
        nameEn: s.name,
        nameAr: ARABIC_NAMES[s.name] ?? s.name,
      }));

      this.logger.log(`Loaded ${this.cache.length} Mauritanian regions`);
    } catch {
      this.logger.warn('Failed to load regions from countriesnow.space, using hardcoded fallback');
      this.cache = this.buildFallback();
    }
  }

  search(q?: string): Region[] {
    if (!q) {
      const top = TOP_5_CODES.map((code) => this.cache.find((r) => r.code === code)).filter(
        Boolean,
      ) as Region[];
      return top.length ? top : this.cache.slice(0, 5);
    }

    const term = q.trim().toLowerCase();
    return this.cache.filter(
      (r) => r.nameAr.includes(term) || r.nameEn.toLowerCase().includes(term),
    );
  }

  private buildFallback(): Region[] {
    return Object.entries(ARABIC_NAMES).map(([nameEn, nameAr], i) => ({
      code: String(i + 1).padStart(2, '0'),
      nameEn,
      nameAr,
    }));
  }
}
