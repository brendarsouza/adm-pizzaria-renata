/**
 * Composables de preenchimento automático de endereço.
 * - `useViaCEP` → busca por CEP (ViaCEP)
 * - `useReverseGeocode` → geocodificação reversa (OpenStreetMap Nominatim)
 */

export interface ViaCEPResult {
  cep: string
  logradouro: string
  complemento: string
  bairro: string
  localidade: string
  uf: string
  erro?: boolean
}

export interface AddressLookupFields {
  street?: string
  number?: string
  complement?: string
  district?: string
  locality?: string
  state?: string
  cep?: string
  latitude?: number
  longitude?: number
}

function digits(s: string): string {
  return (s || '').replace(/\D/g, '')
}

/** Busca dados de endereço pelo CEP (https://viacep.com.br). */
export async function lookupCEP(cep: string): Promise<AddressLookupFields | null> {
  const d = digits(cep)
  if (d.length !== 8) return null
  try {
    const res = await fetch(`https://viacep.com.br/ws/${d}/json/`, {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return null
    const data = (await res.json()) as ViaCEPResult
    if (data.erro) return null
    return {
      cep: `${d.slice(0, 5)}-${d.slice(5)}`,
      street: data.logradouro || undefined,
      district: data.bairro || undefined,
      locality: data.localidade || undefined,
      state: data.uf || undefined,
      complement: data.complemento || undefined,
    }
  } catch {
    return null
  }
}

/**
 * Usa a posição atual do navegador + Nominatim reverse para preencher endereço.
 * Requer permissão do browser. Retorna null em caso de falha/permissão negada.
 */
export async function lookupByCurrentLocation(): Promise<AddressLookupFields | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return null
  const coords = await new Promise<GeolocationPosition | null>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    )
  })
  if (!coords) return null
  const { latitude, longitude } = coords.coords
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`
    const res = await fetch(url, {
      headers: { Accept: 'application/json', 'Accept-Language': 'pt-BR' },
    })
    if (!res.ok) return null
    const data = await res.json() as {
      address?: {
        road?: string
        house_number?: string
        suburb?: string
        neighbourhood?: string
        city?: string
        town?: string
        village?: string
        state?: string
        postcode?: string
      }
    }
    const a = data.address || {}
    return {
      latitude,
      longitude,
      street: a.road,
      number: a.house_number,
      district: a.suburb || a.neighbourhood,
      locality: a.city || a.town || a.village,
      state: a.state,
      cep: a.postcode,
    }
  } catch {
    return { latitude, longitude }
  }
}

/** Formata CEP para 00000-000; aceita qualquer entrada. Retorna vazio se <=4 dígitos. */
export function formatCEP(raw: string): string {
  const d = digits(raw).slice(0, 8)
  if (d.length <= 5) return d
  return `${d.slice(0, 5)}-${d.slice(5)}`
}
