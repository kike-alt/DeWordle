import { Injectable, Logger } from '@nestjs/common';
import {
  AdminRoleRegistry,
  type AdminRole,
} from '../../common/admin-role.registry';
import { type IngestedEventDto } from '../dto/ingested-event.dto';
import { type IndexerLogContext } from '../indexer.service';

@Injectable()
export class AdminRegistryProcessorService {
  private readonly logger = new Logger(AdminRegistryProcessorService.name);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  process(event: IngestedEventDto, _context?: IndexerLogContext): boolean {
    if (
      event.topic !== 'admin_role_registered' &&
      event.topic !== 'admin_role_revoked'
    ) {
      return false;
    }

    const address = this.readStringField(event.payload, 'address');
    if (!address) {
      this.logger.warn({
        msg: 'admin_registry.skip',
        reason: 'missing_address',
        txHash: event.txHash,
      });
      return false;
    }

    if (event.topic === 'admin_role_registered') {
      const role = this.readStringField(event.payload, 'role') as AdminRole;
      if (!role) {
        this.logger.warn({
          msg: 'admin_registry.skip',
          reason: 'missing_role',
          address,
        });
        return false;
      }
      AdminRoleRegistry.register({
        address,
        role,
        grantedAt: new Date(),
      });
      this.logger.log({
        msg: 'admin_registry.registered',
        address,
        role,
      });
    } else {
      AdminRoleRegistry.remove(address);
      this.logger.log({
        msg: 'admin_registry.revoked',
        address,
      });
    }

    return true;
  }

  private readStringField(
    payload: Record<string, unknown>,
    key: string,
  ): string {
    const value = payload[key];
    return typeof value === 'string' ? value : '';
  }
}
