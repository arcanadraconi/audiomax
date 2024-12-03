declare module 'react-dom/client' {
    import type { Root } from 'react-dom';
    export function createRoot(container: Element | DocumentFragment): Root;
    export function hydrateRoot(container: Element | DocumentFragment, children: React.ReactNode): Root;
}

declare module 'react-dom' {
    export interface Root {
        render(children: React.ReactNode): void;
        unmount(): void;
    }
    export * from 'react-dom';
}
