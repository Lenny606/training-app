import path from 'node:path'

/**
 * Vrátí absolutní cestu k adresáři s nahranými soubory.
 * Pokud není nastavena proměnná prostředí UPLOAD_DIR, použije se
 * výchozí složka 'uploads' v kořenu projektu.
 */
export function getUploadDir(): string {
  const envDir = process.env.UPLOAD_DIR
  if (envDir) {
    return path.resolve(envDir)
  }
  return path.resolve(process.cwd(), 'uploads')
}
