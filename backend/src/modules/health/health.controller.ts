import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@SkipThrottle()
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  @ApiOperation({ summary: 'Health check — verifies API and MongoDB connectivity' })
  @Get()
  async check(): Promise<{ status: string; mongodb: string; timestamp: string }> {
    let mongodb = 'ok';

    try {
      await this.connection.db?.admin().ping();
    } catch {
      mongodb = 'unreachable';
    }

    return {
      status: mongodb === 'ok' ? 'ok' : 'degraded',
      mongodb,
      timestamp: new Date().toISOString(),
    };
  }
}
