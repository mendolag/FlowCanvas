/**
 * gif.js type declarations
 */
declare module 'gif.js' {
    interface GIFOptions {
        workers?: number;
        quality?: number;
        width?: number;
        height?: number;
        workerScript?: string;
        repeat?: number;
        background?: string;
        transparent?: string | number | null;
        dither?: boolean | string;
    }

    interface FrameOptions {
        delay?: number;
        copy?: boolean;
        dispose?: number;
    }

    class GIF {
        constructor(options?: GIFOptions);
        addFrame(
            context: CanvasRenderingContext2D | ImageData | HTMLCanvasElement | HTMLImageElement,
            options?: FrameOptions
        ): void;
        on(event: 'finished', callback: (blob: Blob) => void): void;
        on(event: 'progress', callback: (progress: number) => void): void;
        on(event: 'start', callback: () => void): void;
        on(event: 'abort', callback: () => void): void;
        render(): void;
        abort(): void;
    }

    export default GIF;
}
