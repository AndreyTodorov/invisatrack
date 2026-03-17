import sharp from 'sharp'
import { readFileSync } from 'fs'
import { join } from 'path'

const svgBuffer = readFileSync(join(process.cwd(), 'public', 'favicon.svg'))

async function main() {
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(join(process.cwd(), 'public', 'icon-192.png'))

  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(join(process.cwd(), 'public', 'icon-512.png'))

  console.log('✓ icon-192.png generated')
  console.log('✓ icon-512.png generated')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
