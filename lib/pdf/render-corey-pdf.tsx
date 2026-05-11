// Renderiza el PDF del reporte Corey Haines a un Buffer.
// Aislado en su propio archivo para no mezclar JSX server-only con
// utilities que puedan llamarse desde el cliente.

import { renderToBuffer } from "@react-pdf/renderer";
import { CoreyReportPdf, type CoreyPdfData } from "./corey-report-pdf";

export async function renderCoreyPdf(data: CoreyPdfData): Promise<Buffer> {
  return renderToBuffer(<CoreyReportPdf data={data} />);
}
