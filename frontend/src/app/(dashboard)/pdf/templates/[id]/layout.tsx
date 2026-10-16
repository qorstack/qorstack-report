import type { ReactNode } from 'react'

// Static export: this route is exported once with the placeholder id "_"; the backend serves it for every id and
// the page reads the real id from the URL (useRouteParams).
export const generateStaticParams = (): { id: string }[] => [{ id: '_' }]

const IdLayout = ({ children }: { children: ReactNode }): ReactNode => children

export default IdLayout
