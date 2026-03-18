declare module "open-docxtemplater-image-module" {
  export type ImageModuleOptions = {
    centered?: boolean;
    fileType?: "docx" | "pptx";
    getImage: (tagValue: any, tagName: string) => Uint8Array | ArrayBuffer | null;
    getSize: (img: any, tagValue: any, tagName: string) => [number, number];
  };

  export default class ImageModule {
    constructor(options: ImageModuleOptions);
  }
}
