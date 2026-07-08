import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { instanceToPlain } from 'class-transformer';
import { Settings, SettingsDocument } from './schemas/settings.schema';
import { UpdateSettingsDto } from './dto/update-settings.dto';

const DOC_ID = 'public';

/** Returns the raw CMS content — strips Mongo internals, adds no `id`. */
function content(doc: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(doc)) {
    if (key === '_id' || key === '__v') continue;
    out[key] = value;
  }
  return out;
}

@Injectable()
export class SettingsService {
  constructor(
    @InjectModel(Settings.name) private readonly model: Model<SettingsDocument>,
  ) {}

  async getPublic(): Promise<Record<string, unknown>> {
    const doc = await this.model.findById(DOC_ID).lean();
    if (!doc) throw new NotFoundException('Settings document not found');
    return content(doc as Record<string, unknown>);
  }

  async update(dto: UpdateSettingsDto): Promise<Record<string, unknown>> {
    const exists = await this.model.exists({ _id: DOC_ID });
    if (!exists) throw new NotFoundException('Settings document not found');

    const plain = instanceToPlain(dto);
    const clean = Object.fromEntries(
      Object.entries(plain).filter(([, v]) => v !== undefined),
    );
    await this.model.updateOne({ _id: DOC_ID }, { $set: clean });

    const updated = await this.model.findById(DOC_ID).lean();
    return content(updated as Record<string, unknown>);
  }
}
