import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { FirebaseService } from '../../common/firebase/firebase.service';

@SkipThrottle()
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private firebase: FirebaseService) {}

  @ApiOperation({ summary: 'Health check — verifies API and Firestore connectivity' })
  @Get()
  async check(): Promise<{ status: string; firestore: string; timestamp: string }> {
    let firestore = 'ok';

    try {
      await this.firebase.db.collection('health').limit(1).get();
    } catch {
      firestore = 'unreachable';
    }

    return {
      status: firestore === 'ok' ? 'ok' : 'degraded',
      firestore,
      timestamp: new Date().toISOString(),
    };
  }
}
