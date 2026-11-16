const fs = require("fs");
const path = require("path");
const PizZip = require("pizzip");

const templates = [
  path.resolve(__dirname, "../public/templates/elektro_rz_template_compact_conditional_images_boxed.docx"),
  path.resolve(__dirname, "../dist/templates/elektro_rz_template_compact_conditional_images_boxed.docx"),
];

const montageTable = `
<w:tbl>
  <w:tblPr>
    <w:tblW w:w="0" w:type="auto"/>
    <w:tblBorders>
      <w:top w:val="single" w:sz="4" w:space="0" w:color="B7C9E2"/>
      <w:left w:val="single" w:sz="4" w:space="0" w:color="B7C9E2"/>
      <w:bottom w:val="single" w:sz="4" w:space="0" w:color="B7C9E2"/>
      <w:right w:val="single" w:sz="4" w:space="0" w:color="B7C9E2"/>
      <w:insideH w:val="single" w:sz="4" w:space="0" w:color="B7C9E2"/>
      <w:insideV w:val="single" w:sz="4" w:space="0" w:color="B7C9E2"/>
    </w:tblBorders>
  </w:tblPr>
  <w:tblGrid><w:gridCol w:w="3000"/><w:gridCol w:w="6300"/></w:tblGrid>
  <w:tr>
    <w:tc><w:tcPr><w:tcW w:w="3000" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="EAF1F8"/></w:tcPr><w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Montážní firma</w:t></w:r></w:p></w:tc>
    <w:tc><w:tcPr><w:tcW w:w="6300" w:type="dxa"/></w:tcPr><w:p><w:r><w:t>{{montazni_firma}}</w:t></w:r></w:p></w:tc>
  </w:tr>
  <w:tr>
    <w:tc><w:tcPr><w:tcW w:w="3000" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="EAF1F8"/></w:tcPr><w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Oprávnění montážní firmy</w:t></w:r></w:p></w:tc>
    <w:tc><w:tcPr><w:tcW w:w="6300" w:type="dxa"/></w:tcPr><w:p><w:r><w:t>{{montazni_opravneni}}</w:t></w:r></w:p></w:tc>
  </w:tr>
</w:tbl><w:p/>`;

for (const templatePath of templates) {
  if (!fs.existsSync(templatePath)) {
    console.log(`Skipped missing build output: ${templatePath}`);
    continue;
  }

  const zip = new PizZip(fs.readFileSync(templatePath));
  const documentPath = "word/document.xml";
  let xml = zip.file(documentPath).asText();

  if (xml.includes("montazni_firma") && xml.includes("montazni_opravneni")) {
    console.log(`Already patched: ${templatePath}`);
    continue;
  }

  const technicianAddress = xml.indexOf("technik_adresa");
  if (technicianAddress < 0) {
    throw new Error(`Anchor technik_adresa not found in ${templatePath}`);
  }

  const technicianTableEnd = xml.indexOf("</w:tbl>", technicianAddress);
  if (technicianTableEnd < 0) {
    throw new Error(`Technician table end not found in ${templatePath}`);
  }

  const insertAt = technicianTableEnd + "</w:tbl>".length;
  xml = `${xml.slice(0, insertAt)}${montageTable}${xml.slice(insertAt)}`;
  zip.file(documentPath, xml);
  fs.writeFileSync(templatePath, zip.generate({ type: "nodebuffer", compression: "DEFLATE" }));
  console.log(`Patched: ${templatePath}`);
}
