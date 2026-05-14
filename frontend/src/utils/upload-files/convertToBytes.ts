type SizeUnit = 'Bytes' | 'KB' | 'MB' | 'GB' | 'TB'

export const convertToBytes = (props: { size: number; unit: SizeUnit }): number => {
  switch (props.unit) {
    case 'KB':
      return props.size * 1024
    case 'MB':
      return props.size * 1024 * 1024
    case 'GB':
      return props.size * 1024 * 1024 * 1024
    case 'TB':
      return props.size * 1024 * 1024 * 1024 * 1024
    case 'Bytes':
    default:
      return props.size
  }
}
