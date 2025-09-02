import type { Metadata } from 'next'
import './globals.css'


export const metadata: Metadata = {
title: 'Life Calendar',
description: 'A week-by-week view of your life',
}


export default function RootLayout({ children }: { children: React.ReactNode }) {
return (
<html lang="en" suppressHydrationWarning>
<body className="bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
{children}
</body>
</html>
)
}