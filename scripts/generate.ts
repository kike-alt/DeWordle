#!/usr/bin/env ts-node
/**
 * DX-106: Code generation CLI for common DeWordle patterns.
 * Usage:
 *   npx ts-node scripts/generate.ts module <name>
 *   npx ts-node scripts/generate.ts service <name>
 *   npx ts-node scripts/generate.ts dto <name>
 *
 * Generates files in backend/src/<name>/ following project conventions.
 */
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const [, , schematic, rawName] = process.argv;
if (!schematic || !rawName) {
  console.error('Usage: generate.ts <module|service|dto> <name>');
  process.exit(1);
}

const name = rawName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
const pascal = name.split('-').map((s) => s[0].toUpperCase() + s.slice(1)).join('');
const outputDir = join('backend', 'src', name);

function write(relPath: string, content: string): void {
  const fullPath = join(outputDir, relPath);
  if (existsSync(fullPath)) {
    console.warn(`⚠  ${fullPath} already exists — skipping`);
    return;
  }
  writeFileSync(fullPath, content, 'utf8');
  console.log(`✅ Created ${fullPath}`);
}

if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

if (schematic === 'module') {
  write(`${name}.module.ts`, `import { Module } from '@nestjs/common';
import { ${pascal}Service } from './${name}.service';
import { ${pascal}Controller } from './${name}.controller';

@Module({
  controllers: [${pascal}Controller],
  providers: [${pascal}Service],
  exports: [${pascal}Service],
})
export class ${pascal}Module {}
`);

  write(`${name}.service.ts`, `import { Injectable } from '@nestjs/common';

@Injectable()
export class ${pascal}Service {}
`);

  write(`${name}.controller.ts`, `import { Controller } from '@nestjs/common';
import { ${pascal}Service } from './${name}.service';

@Controller('${name}')
export class ${pascal}Controller {
  constructor(private readonly ${name}Service: ${pascal}Service) {}
}
`);

} else if (schematic === 'dto') {
  write(`dto/create-${name}.dto.ts`, `import { IsString, IsNotEmpty } from 'class-validator';

export class Create${pascal}Dto {
  @IsString()
  @IsNotEmpty()
  name: string;
}
`);

  write(`dto/update-${name}.dto.ts`, `import { PartialType } from '@nestjs/mapped-types';
import { Create${pascal}Dto } from './create-${name}.dto';

export class Update${pascal}Dto extends PartialType(Create${pascal}Dto) {}
`);

} else {
  console.error(`Unknown schematic: ${schematic}. Use: module | service | dto`);
  process.exit(1);
}