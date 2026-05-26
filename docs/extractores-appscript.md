# Extractores de Meta Ads en Google Apps Script

Documentación de las aplicaciones de **Google Apps Script** que alimentan
la ingesta de Meta Ads. No viven en este repo (corren en la cuenta de
Google de `reportes@transfil.com.ar`), pero su fuente se versiona acá
porque son críticas para la integridad de los datos y Apps Script no
tiene control de versiones propio.

> ⚠️ **Seguridad:** el `META_TOKEN` real **nunca** se commitea. En el
> código de abajo va como placeholder. En los proyectos vivos conviene
> moverlo a *Script Properties*
> (`PropertiesService.getScriptProperties().getProperty('META_TOKEN')`)
> en vez de hardcodearlo.

## Por qué existen

Google Ads y GA4 tienen caminos nativos hacia nuestra base:

- **Google Ads** → genera sus sheets vía *Google Ads Scripts* (plataforma
  distinta, corre dentro de Google Ads).
- **GA4** → la Edge Function `ingest-reports` lo pide directo a la GA4
  Data API.

**Meta no tiene un export nativo a Drive.** Por eso estos tres scripts
de Apps Script consultan la *Meta Marketing API* (Insights) y escriben
un Google Sheets por nivel en una carpeta de Drive. La Edge Function
`ingest-reports` después lee el sheet más reciente de cada carpeta y
hace upsert en las tablas `fact_*_daily`.

```
Apps Script (lun 04:00 ART)  →  Google Sheets en Drive
        │                              │
        │ Meta Marketing API           │ (1 sheet por nivel)
        ▼                              ▼
   Insights (daily)          ingest-reports (lun 06:00 ART)
                                       │ upsert por (date, *_id)
                                       ▼
                          fact_campaign_daily / fact_adset_daily / fact_ad_daily
```

## Las tres aplicaciones

Son tres proyectos de Apps Script independientes, uno por nivel de
granularidad. Comparten token, ad account y helpers; sólo cambian el
`level`, los `fields`, la carpeta de Drive destino y el formato de salida.

| Proyecto | `level` | Carpeta de Drive (`FOLDER_ID`) | Env var de la ingesta | Archivo generado |
|---|---|---|---|---|
| Campañas | `campaign` | `1GIrJ6FNZ4RednoeGZQtHGgS1CFYw8Vbs` | (fija en `index.ts`, `meta`) | `meta_YYYYMMDD` |
| Ad sets | `adset` | `1ABJWWwsu8wkfaac0qsqsCXpL2UDGsmGV` | `DRIVE_FOLDER_META_ADSETS` | `meta-adsets_YYYYMMDD` |
| Ads | `ad` | `1XaQv_4WeQs92TDwF5qKHsEXcB83pjqU1` | `DRIVE_FOLDER_META_ADS` | `meta-ads_YYYYMMDD` |

**Config común:**

- `AD_ACCOUNT_ID = act_1465675161816069`
- `API_VERSION = v21.0`
- `DAYS_BACK = 45` — ventana de días que se trae en cada corrida (ver
  más abajo por qué 45 y por qué no acumula).
- **Trigger:** time-driven, lunes 04:00 ART. Importante que terminen
  **antes** de las 06:00, cuando corre la ingesta.

## Formato de salida por nivel

La ingesta lee **por posición de columna, no por nombre de header**
(los normalizers en `supabase/functions/ingest-reports/lib/normalizers/meta*.ts`
destructuran el array por índice). Respetar el orden es lo único que
importa.

**Campañas (9 columnas):**
```
Fecha | ID de campaña | Campaña | Objetivo | Impresiones | Clics
| Inversión (ARS) | Conversiones | Valor de conversión
```

**Ad sets (9 columnas):**
```
date | campaign_id | adset_id | adset_name | impressions | clicks
| spend | conversions | revenue
```

**Ads (10 columnas):**
```
date | campaign_id | adset_id | ad_id | ad_name | impressions | clicks
| spend | conversions | revenue
```

Los `*_id` son los external_id de Meta (los mismos que la ingesta usa
para hacer join contra `dim_campaign` / `dim_adset`). Por eso es clave
que los scripts traigan los IDs y no sólo los nombres.

## Cómo se calculan las "conversiones" (lo más importante)

Plasmart corre campañas de **consultas por WhatsApp**. Meta cuenta esas
consultas como **"Resultados" / conversaciones de mensajería iniciadas**,
no como "Conversiones" (esa columna depende de eventos de píxel/web que
en campañas de mensajería nunca se disparan → da 0).

En la Insights API esas conversaciones llegan dentro del array `actions`,
con el `action_type`:

```
onsite_conversion.messaging_conversation_started_7d
```

El helper `sumActions(row.actions, [...])` suma los `value` de los
`action_type` que nos interesan. La lista que usamos para la columna
`conversions` es:

```javascript
const conversions = sumActions(row.actions, [
  'lead',
  'offsite_conversion.fb_pixel_lead',
  'onsite_conversion.lead_grouped',
  'purchase',
  'offsite_conversion.fb_pixel_purchase',
  'onsite_conversion.messaging_conversation_started_7d', // ← consultas WhatsApp
]);
```

### ⚠️ Por qué NO usamos la columna "Results" de Meta

La métrica "Results" del Ads Manager es **polimórfica**: cambia de
significado según el objetivo de cada campaña. Ejemplo real (abril–mayo 2026):

| Campaña | Objetivo | "Results" | Result indicator |
|---|---|---|---|
| Plasmart Sales | mensajes | 359 | `...messaging_conversation_started_7d` ✅ |
| Plasmart Industrial (Consideración) | mensajes | 36 | `...messaging_conversation_started_7d` ✅ |
| Plasmart Awareness | alcance | 217.718 | `reach` ⚠️ |

Si tomáramos "Results" tal cual, la campaña Awareness metería 217.718
"conversiones" que en realidad son **alcance**. Por eso sumamos
`action_type` específicos: las campañas de mensajería cuentan sus
conversaciones, y Awareness queda en **0 conversiones** (correcto — es
de alcance, se juzga por reach/CPM, no por conversiones).

> Si el `action_type` de mensajería de la cuenta aparece con otro sufijo
> (`_d7`, `_1d`, etc.), verificarlo con una corrida de prueba que loguee
> `JSON.stringify(row.actions)` y ajustar la lista en los tres scripts.

## Ventana de 45 días y por qué no acumula

`DAYS_BACK = 45` hace que cada corrida traiga los últimos 45 días. El
solapamiento semana a semana **no duplica datos** por tres motivos
combinados:

1. Los scripts piden `time_increment: '1'` → **una fila por día** por
   campaña/adset/ad (la fecha viaja como dato).
2. La ingesta hace `upsert` con `onConflict: "date,campaign_id"` (y
   `date,adset_id` / `date,ad_id`). Re-leer un día que ya existe **pisa
   el valor, no lo suma**.
3. La ingesta lee **sólo el archivo más reciente** de cada carpeta
   (`files[0]`), nunca todos. Drive puede juntar muchos sheets viejos;
   no se suman entre sí.

Bonus: re-pisar los últimos 45 días mantiene los números finales, porque
la atribución de mensajería (`_7d`) sigue ajustándose hasta 7 días
después de cada conversación.

## Backfill / corrección de histórico

Para corregir datos viejos cargados mal (p. ej. conversiones en 0 antes
de mapear la métrica de WhatsApp):

1. Subir `DAYS_BACK` (o forzar un `time_range` explícito) para cubrir el
   rango a corregir, en los **tres** proyectos.
2. Correr `main()` una vez en cada uno → cada uno deja un sheet con todo
   el histórico diario.
3. Forzar la ingesta (`/admin` → "Forzar ingesta ahora"). El upsert por
   `(date, *_id)` reescribe las filas viejas en el lugar.
4. Volver `DAYS_BACK` a 45.

**Ojo con el volumen:** el script de campañas no pagina (límite 500),
suficiente para ~5 meses con pocas campañas. Los de adsets/ads sí
paginan, así que aguantan rangos largos.

**Ojo con el alcance:** el backfill sólo corrige el rango que traés. Las
filas en `fact_*_daily` anteriores a la ventana quedan intactas; si
filtrás un rango que las incluya, vas a ver los valores viejos. Si hay
que limpiarlas, es un `DELETE` aparte en el SQL editor de Supabase.

## Fuente de los tres scripts

Copia de referencia (token redactado). La fuente viva está en los
proyectos de Apps Script de `reportes@transfil.com.ar`.

### Campañas

```javascript
const META_TOKEN = '<EN SCRIPT PROPERTIES — NO COMMITEAR>';
const AD_ACCOUNT_ID = 'act_1465675161816069';
const FOLDER_ID = '1GIrJ6FNZ4RednoeGZQtHGgS1CFYw8Vbs';
const DAYS_BACK = 45;
const API_VERSION = 'v21.0';

function main() {
  const today = new Date();
  const endDate = new Date(today);
  endDate.setDate(today.getDate() - 1);
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - DAYS_BACK);

  const startStr = formatDate(startDate);
  const endStr = formatDate(endDate);

  const baseUrl = `https://graph.facebook.com/${API_VERSION}/${AD_ACCOUNT_ID}/insights`;
  const params = {
    fields: [
      'campaign_id', 'campaign_name', 'objective', 'impressions', 'clicks',
      'spend', 'actions', 'action_values', 'date_start', 'date_stop',
    ].join(','),
    level: 'campaign',
    time_increment: '1',
    time_range: JSON.stringify({ since: startStr, until: endStr }),
    limit: '500',
    access_token: META_TOKEN,
  };

  const response = UrlFetchApp.fetch(baseUrl + '?' + objectToQueryString(params), { muteHttpExceptions: true });
  if (response.getResponseCode() !== 200) {
    throw new Error(`Meta API respondió ${response.getResponseCode()}: ${response.getContentText()}`);
  }
  const rows = JSON.parse(response.getContentText()).data || [];

  const headers = ['Fecha', 'ID de campaña', 'Campaña', 'Objetivo', 'Impresiones', 'Clics', 'Inversión (ARS)', 'Conversiones', 'Valor de conversión'];
  const data = [headers];

  rows.forEach(function (row) {
    const conversions = sumActions(row.actions, [
      'lead', 'offsite_conversion.fb_pixel_lead', 'onsite_conversion.lead_grouped',
      'purchase', 'offsite_conversion.fb_pixel_purchase',
      'onsite_conversion.messaging_conversation_started_7d',
    ]);
    const conversionValue = sumActions(row.action_values, [
      'lead', 'offsite_conversion.fb_pixel_lead', 'purchase', 'offsite_conversion.fb_pixel_purchase',
    ]);
    data.push([
      row.date_start, row.campaign_id, row.campaign_name, row.objective || '',
      parseInt(row.impressions, 10) || 0, parseInt(row.clicks, 10) || 0,
      parseFloat(row.spend) || 0, conversions, conversionValue,
    ]);
  });

  writeNewSheet(data, headers, `meta_${formatDate(today)}`, FOLDER_ID);
}

// Helpers compartidos: sumActions, objectToQueryString, formatDate, writeNewSheet, paginate
// (ver "Helpers" abajo)
```

### Ad sets

Idéntico a campañas salvo:
- `FOLDER_ID = '1ABJWWwsu8wkfaac0qsqsCXpL2UDGsmGV'`
- `level: 'adset'`, `fields` incluye `adset_id`, `adset_name` (sin `objective`/`date_stop`).
- headers: `['date','campaign_id','adset_id','adset_name','impressions','clicks','spend','conversions','revenue']`
- usa `paginate()` en lugar de un solo `fetch` (los adsets pueden pasar las 500 filas).
- nombre de archivo `meta-adsets_YYYYMMDD`.

### Ads

Idéntico a ad sets salvo:
- `FOLDER_ID = '1XaQv_4WeQs92TDwF5qKHsEXcB83pjqU1'`
- `level: 'ad'`, `fields` incluye `ad_id`, `ad_name`.
- headers: `['date','campaign_id','adset_id','ad_id','ad_name','impressions','clicks','spend','conversions','revenue']`
- nombre de archivo `meta-ads_YYYYMMDD`.

### Helpers compartidos

```javascript
function paginate(initialUrl) {
  const out = [];
  let url = initialUrl;
  while (url) {
    const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) {
      throw new Error('Meta API respondió ' + res.getResponseCode() + ': ' + res.getContentText());
    }
    const body = JSON.parse(res.getContentText());
    if (Array.isArray(body.data)) out.push.apply(out, body.data);
    url = body.paging && body.paging.next ? body.paging.next : null;
  }
  return out;
}

function sumActions(actions, types) {
  if (!actions || !Array.isArray(actions)) return 0;
  let total = 0;
  actions.forEach(function (action) {
    if (types.indexOf(action.action_type) !== -1) {
      total += parseFloat(action.value) || 0;
    }
  });
  return total;
}

function objectToQueryString(obj) {
  return Object.keys(obj)
    .map(function (key) { return encodeURIComponent(key) + '=' + encodeURIComponent(obj[key]); })
    .join('&');
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function writeNewSheet(data, headers, fileName, folderId) {
  const folder = DriveApp.getFolderById(folderId);
  const spreadsheet = SpreadsheetApp.create(fileName);
  const sheet = spreadsheet.getActiveSheet();
  if (data.length > 1) {
    sheet.getRange(1, 1, data.length, data[0].length).setValues(data);
    sheet.getRange(1, 1, 1, data[0].length).setFontWeight('bold');
    sheet.autoResizeColumns(1, data[0].length);
  } else {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  const file = DriveApp.getFileById(spreadsheet.getId());
  folder.addFile(file);
  try { DriveApp.getRootFolder().removeFile(file); } catch (e) {}
}
```
