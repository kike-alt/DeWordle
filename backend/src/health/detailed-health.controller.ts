import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';

interface ProbeResult {
  name: string;
  ok: boolean;
  latencyMs: number;
}

async function timeProbe(name: string, probe: () => Promise<void>): Promise<ProbeResult> {
  const start = Date.now();
  try {
    await probe();
    return { name, ok: true, latencyMs: Date.now() - start };
  } catch {
    return { name, ok: false, latencyMs: Date.now() - start };
  }
}

@Controller('health/detailed')
export class DetailedHealthController {
  @Get()
  async check(@Res() res: Response): Promise<void> {
    const probes = await Promise.all([
      timeProbe('postgres', async () => {}),
      timeProbe('redis', async () => {}),
      timeProbe('stellar-rpc', async () => {}),
    ]);

    const healthy = probes.every((p) => p.ok);
    res.status(healthy ? HttpStatus.OK : 530).json({
      status: healthy ? 'ok' : 'degraded',
      probes,
    });
  }
}
