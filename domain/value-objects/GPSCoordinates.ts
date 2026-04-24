export class GPSCoordinatesVO {
  private constructor(
    public readonly latitude: number,
    public readonly longitude: number,
  ) {}

  static create(lat: number, lng: number): GPSCoordinatesVO {
    if (lat < -90 || lat > 90) throw new Error('Latitude fora do intervalo [-90, 90]')
    if (lng < -180 || lng > 180) throw new Error('Longitude fora do intervalo [-180, 180]')
    return new GPSCoordinatesVO(lat, lng)
  }

  static fromWhatsAppLink(url: string): GPSCoordinatesVO | null {
    // Ex: https://maps.google.com/?q=-23.5505,-46.6333  ou  https://www.google.com/maps/place/.../@-23.5,-46.6,15z
    const m = url.match(/-?\d+\.\d+/g)
    if (!m || m.length < 2) return null
    const lat = parseFloat(m[0]!)
    const lng = parseFloat(m[1]!)
    try {
      return GPSCoordinatesVO.create(lat, lng)
    } catch {
      return null
    }
  }

  toString(): string {
    return `${this.latitude},${this.longitude}`
  }
}
