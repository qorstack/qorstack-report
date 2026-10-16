import Image from 'next/image'
import React from 'react'

import { CodeSwitcher, useSharedLanguage } from './CodeSwitcher'
import { Highlight, PropertyTable, SubSection } from './DocComponents'
import {
  getImageExamples,
  getQrExamples,
  getTableExamples,
  getVariableExamples,
  getBarcodeExamples,
  getFileSettingsExamples
} from './examples'

const introClass = 'mb-6 max-w-[65ch] text-[15px] leading-relaxed text-default-500'
const inlineCodeClass = 'border border-divider bg-content2 px-1.5 py-0.5 font-mono text-[12px] text-primary-600 dark:text-[#FFB4AC]'
const tokenClass = 'font-mono text-[12px] text-primary'
const imageFrameClass = 'relative overflow-hidden border border-divider bg-content1'
const cardSurfaceClass = 'border border-divider bg-content1'

export const VariablesContent = () => {
  const [activeLang, setActiveLang] = useSharedLanguage()
  return (
    <div>
      <p className={introClass}>
        Use <Highlight>{`{{variable}}`}</Highlight> in your Word document to define placeholders.
      </p>

      <div className='grid grid-cols-1 gap-6'>
        <SubSection title='Template (.docx)'>
          <div className={imageFrameClass}>
            <Image
              src='/images/docs/variable-02.svg'
              alt='Variables in Word'
              width={800}
              height={400}
              className='h-auto w-full object-contain'
            />
          </div>
        </SubSection>
        <SubSection title='Data Payload'>
          <PropertyTable
            data={[
              {
                name: 'key',
                type: 'string',
                required: true,
                desc: 'Template variable name (e.g. {{name}} -> "name").'
              },
              { name: 'value', type: 'string', required: true, desc: 'Replacement text.' }
            ]}
          />
          <CodeSwitcher
            activeLang={activeLang}
            onLangChange={setActiveLang}
            examples={getVariableExamples('template')}
          />
        </SubSection>
      </div>
    </div>
  )
}

export const TablesBasicContent = () => {
  const [activeLang, setActiveLang] = useSharedLanguage()
  return (
    <div>
      <p className={introClass}>
        Create dynamic tables using <Highlight>{`{{row:field}}`}</Highlight> markers inside a table row. The API expects
        a <code className={inlineCodeClass}>table</code> array where each item contains{' '}
        <code className={inlineCodeClass}>rows</code>.
      </p>

      <SubSection title='Template (.docx)'>
        <div className='grid grid-cols-1 gap-4'>
          <p className='text-[13px] font-normal leading-snug text-default-500'>
            Put <code className={inlineCodeClass}>{`{{row:name}}`}</code>,{' '}
            <code className={inlineCodeClass}>{`{{row:qty}}`}</code>, and other row markers in the template row that
            should repeat.
          </p>
          <div className={imageFrameClass}>
            <Image
              src='/images/docs/table-02.svg'
              alt='Table in Word'
              width={800}
              height={400}
              className='h-auto w-full object-contain'
            />
          </div>
          <PropertyTable
            data={[
              { name: 'table', type: 'WordTableDataRequest[]', required: false, desc: 'Array of table data requests.' },
              {
                name: 'columns',
                type: 'string[]',
                required: true,
                desc: 'Column names, listed once; each matches a {{row:name}} marker. Must be unique.'
              },
              {
                name: 'rows',
                type: '(string | number | boolean | null)[][]',
                required: true,
                desc: 'Array of rows; each row holds the values in the order of columns. A row with the wrong number of values returns 400 naming the row.'
              },
              {
                name: 'repeatHeader',
                type: 'boolean',
                required: false,
                desc: 'Repeat the Word table header row on each page.'
              }
            ]}
          />
        </div>
      </SubSection>

      <div className='mt-6'>
        <CodeSwitcher activeLang={activeLang} onLangChange={setActiveLang} examples={getTableExamples('template')} />
      </div>
    </div>
  )
}

export const TablesAdvancedContent = () => {
  return (
    <div>
      <p className={introClass}>
        Advanced table features including sorting, grouping, vertical merge, collapse, and aggregates.
      </p>

      <SubSection title='Advanced Properties'>
        <PropertyTable
          data={[
            {
              name: 'sort',
              type: '{ field, direction }[]',
              required: false,
              desc: 'Sorting rules, applied in order (e.g. [{ "field": "price", "direction": "desc" }]).'
            },
            {
              name: 'verticalMerge',
              type: 'string[]',
              required: false,
              desc: (
                <div className='flex flex-col gap-1'>
                  <span>Merges cells with identical values vertically. Names must be in columns.</span>
                  <span className='text-[13px] text-default-500'>{`ex. ["category", "date"]`}</span>
                </div>
              )
            },
            {
              name: 'collapse',
              type: 'string[]',
              required: false,
              desc: (
                <div className='flex flex-col gap-1'>
                  <span>Collapses identical rows into a single row.</span>
                  <span className='text-[13px] text-default-500'>{`ex. ["date", "store_branch"]`}</span>
                </div>
              )
            }
          ]}
        />
      </SubSection>

      <div className='flex flex-col gap-6'>
        <SubSection id='tables-grouping' title='Template Grouping Styles'>
          <div className='flex flex-col gap-4'>
            <div className={`${cardSurfaceClass} flex min-w-0 flex-col p-4`}>
              <h5 className='mb-2 text-[14px] font-bold uppercase tracking-[0.02em] text-foreground'>
                Header Row Grouping
              </h5>
              <p className='mb-3 text-[13px] font-normal leading-snug text-default-500'>
                Place the Header row <strong className='font-semibold text-foreground'>above</strong> the data row to
                display a group header (used in conjunction with the first{' '}
                <code className={inlineCodeClass}>verticalMerge</code> item).
              </p>
              <div className='mt-auto overflow-x-auto border border-divider bg-background'>
                <table className='w-full min-w-max text-left text-[12px]'>
                  <thead className='bg-content1 font-mono uppercase tracking-[0.1em] text-default-500'>
                    <tr>
                      <th className='whitespace-nowrap border-r border-divider p-2 font-medium'>Item Name</th>
                      <th className='whitespace-nowrap border-r border-divider p-2 font-medium'>Qty</th>
                      <th className='whitespace-nowrap p-2 font-medium'>Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className='bg-primary/10'>
                      <td className={`whitespace-nowrap p-2 ${tokenClass}`} colSpan={3}>
                        Category: {'{{group:category}}'} ({'{{group_count}}'} items)
                      </td>
                    </tr>
                    <tr className='border-t border-divider'>
                      <td className={`whitespace-nowrap border-r border-divider p-2 ${tokenClass}`}>
                        {'{{row:name}}'}
                      </td>
                      <td className={`whitespace-nowrap border-r border-divider p-2 ${tokenClass}`}>{'{{row:qty}}'}</td>
                      <td className={`whitespace-nowrap p-2 ${tokenClass}`}>{'{{row:price}}'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className='mt-3 text-[13px] font-normal leading-snug text-default-500'>
                <strong className='font-semibold text-foreground'>Note:</strong> Use the{' '}
                <code className={inlineCodeClass}>{`{{group:field}}`}</code> marker in the Header Row to indicate where
                the group name will be displayed.
              </p>
            </div>

            <div className={`${cardSurfaceClass} flex min-w-0 flex-col p-4`}>
              <h5 className='mb-2 text-[14px] font-bold uppercase tracking-[0.02em] text-foreground'>
                Footer Grouping
              </h5>
              <p className='mb-3 text-[13px] font-normal leading-snug text-default-500'>
                Place a summary row <strong className='font-semibold text-foreground'>below</strong> the data row to
                show the total at the end of each group.
              </p>
              <div className='overflow-x-auto border border-divider bg-background'>
                <table className='w-full min-w-max text-left text-[12px]'>
                  <thead className='sr-only'>
                    <tr>
                      <th>Item Name</th>
                      <th>Qty</th>
                      <th>Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className={`whitespace-nowrap border-r border-divider p-2 ${tokenClass}`}>
                        {'{{row:name}}'}
                      </td>
                      <td className={`whitespace-nowrap border-r border-divider p-2 ${tokenClass}`}>{'{{row:qty}}'}</td>
                      <td className={`whitespace-nowrap p-2 ${tokenClass}`}>{'{{row:price}}'}</td>
                    </tr>
                    <tr className='border-t border-divider bg-primary/10 font-medium'>
                      <td className='whitespace-nowrap border-r border-divider p-2 text-[12px] font-semibold text-foreground'>
                        Total for <span className={tokenClass}>{'{{group:category}}'}</span>
                      </td>
                      <td className={`whitespace-nowrap border-r border-divider p-2 ${tokenClass}`}>
                        {'{{group_sum:qty}}'}
                      </td>
                      <td className='whitespace-nowrap p-2 text-[12px] font-semibold text-foreground'>
                        Total <span className={tokenClass}>{'{{group_sum:price}}'}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </SubSection>

        <SubSection id='tables-aggregates' title='Aggregates'>
          <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
            {[
              {
                scope: 'Table Scope',
                desc: 'Used to display the grand totals for the entire table.',
                rows: [
                  { token: '{{table_count}}', desc: 'Total item count' },
                  { token: '{{table_sum:field}}', desc: 'Grand total sum' },
                  { token: '{{table_avg:field}}', desc: 'Grand total average' }
                ]
              },
              {
                scope: 'Group Scope',
                desc: 'Used in the Group Header or Group Footer.',
                rows: [
                  { token: '{{group_count}}', desc: 'Group item count' },
                  { token: '{{group_sum:field}}', desc: 'Group subtotal sum' },
                  { token: '{{group_avg:field}}', desc: 'Group subtotal average' }
                ]
              },
              {
                scope: 'Row Scope',
                desc: 'Used to calculate values between fields in the same row.',
                rows: [
                  { token: '{{row_sum:f1,f2}}', desc: 'Sum of specific fields' },
                  { token: '{{row_avg:f1,f2}}', desc: 'Average of specific fields' }
                ]
              }
            ].map(group => (
              <div key={group.scope} className={`${cardSurfaceClass} flex flex-col p-4`}>
                <h6 className='mb-1 font-mono text-[12px] font-bold uppercase tracking-[0.12em] text-foreground'>
                  {group.scope}
                </h6>
                <p className='mb-3 text-[13px] font-normal leading-snug text-default-500'>{group.desc}</p>
                <div className='flex flex-col gap-2'>
                  {group.rows.map(row => (
                    <div key={row.token} className='flex min-w-0 flex-col gap-1 border border-divider bg-background px-2.5 py-2'>
                      <code className={`${tokenClass} break-all`}>{row.token}</code>
                      <span className='text-[12px] leading-snug text-default-500'>{row.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </SubSection>
      </div>
    </div>
  )
}

export const ImagesContent = () => {
  const [activeLang, setActiveLang] = useSharedLanguage()
  return (
    <div>
      <p className={introClass}>
        Insert images dynamically using <Highlight>{`{{image:variable}}`}</Highlight>.
      </p>

      <div className='grid grid-cols-1 gap-6'>
        <SubSection title='Template (.docx)'>
          <div className={imageFrameClass}>
            <Image
              src='/images/docs/images-02.svg'
              alt='Images in Word'
              width={800}
              height={400}
              className='h-auto w-full object-contain'
            />
          </div>
        </SubSection>
        <SubSection title='Data Payload'>
          <PropertyTable
            data={[
              {
                name: 'key',
                type: 'string',
                required: true,
                desc: 'Image marker name (e.g. {{image:logo}} -> "logo").'
              },
              { name: 'src', type: 'string', required: true, desc: 'Image URL, data URL, or stored file URL.' },
              { name: 'width', type: 'number', required: false, desc: 'Image width (px).' },
              { name: 'height', type: 'number', required: false, desc: 'Image height (px).' },
              { name: 'fit', type: 'string', required: false, desc: 'Image fit: "cover", "contain", "fill".' }
            ]}
          />
          <CodeSwitcher activeLang={activeLang} onLangChange={setActiveLang} examples={getImageExamples('template')} />
        </SubSection>
      </div>
    </div>
  )
}

export const QrCodesContent = () => {
  const [activeLang, setActiveLang] = useSharedLanguage()
  return (
    <div>
      <p className={introClass}>
        Generate QR codes automatically with <Highlight>{`{{qrcode:variable}}`}</Highlight>.
      </p>

      <div className='grid grid-cols-1 gap-6'>
        <SubSection title='Template (.docx)'>
          <div className={imageFrameClass}>
            <Image
              src='/images/docs/qrcode-02.svg'
              alt='QR Code in Word'
              width={800}
              height={400}
              className='h-auto w-full object-contain'
            />
          </div>
        </SubSection>
        <SubSection title='Data Payload'>
          <PropertyTable
            data={[
              {
                name: 'key',
                type: 'string',
                required: true,
                desc: 'QR code marker name (e.g. {{qrcode:payment}} -> "payment").'
              },
              { name: 'text', type: 'string', required: true, desc: 'Content to encode.' },
              { name: 'size', type: 'number', required: false, desc: 'QR code size (px).' },
              { name: 'color', type: 'string', required: false, desc: 'Foreground color, e.g. "#111827".' },
              { name: 'backgroundColor', type: 'string', required: false, desc: 'Background color.' },
              { name: 'logo', type: 'string', required: false, desc: 'Optional logo URL placed in the QR code center.' }
            ]}
          />
          <CodeSwitcher activeLang={activeLang} onLangChange={setActiveLang} examples={getQrExamples('template')} />
        </SubSection>
      </div>
    </div>
  )
}

export const BarcodesContent = () => {
  const [activeLang, setActiveLang] = useSharedLanguage()
  return (
    <div>
      <p className={introClass}>
        Generate Barcodes automatically with <Highlight>{`{{barcode:variable}}`}</Highlight>.
      </p>

      <div className='grid grid-cols-1 gap-6'>
        <SubSection title='Template (.docx)'>
          <div className={imageFrameClass}>
            <Image
              src='/images/docs/barcode-02.svg'
              alt='Barcode in Word'
              width={800}
              height={400}
              className='h-auto w-full object-contain'
            />
          </div>
        </SubSection>
        <SubSection title='Data Payload'>
          <PropertyTable
            data={[
              {
                name: 'key',
                type: 'string',
                required: true,
                desc: 'Barcode marker name (e.g. {{barcode:sku}} -> "sku").'
              },
              { name: 'text', type: 'string', required: true, desc: 'Content to encode.' },
              { name: 'format', type: 'string', required: false, desc: 'Barcode format, default "Code128".' },
              { name: 'width', type: 'number', required: false, desc: 'Barcode width (px).' },
              { name: 'height', type: 'number', required: false, desc: 'Barcode height (px).' },
              {
                name: 'includeText',
                type: 'boolean',
                required: false,
                desc: 'Show human-readable text under the bars.'
              },
              { name: 'color', type: 'string', required: false, desc: 'Foreground color.' },
              { name: 'backgroundColor', type: 'string', required: false, desc: 'Background color.' }
            ]}
          />
          <CodeSwitcher
            activeLang={activeLang}
            onLangChange={setActiveLang}
            examples={getBarcodeExamples('template')}
          />
        </SubSection>
      </div>
    </div>
  )
}

export const FileSettingsContent = () => {
  const [activeLang, setActiveLang] = useSharedLanguage()
  return (
    <div>
      <p className={introClass}>
        Configure high-level render options such as PDF password protection, watermarking, and ZIP output.
      </p>

      <div className='flex flex-col gap-6'>
        <SubSection title='Template (.docx)'>
          <div className={imageFrameClass}>
            <Image
              src='/images/docs/file-settings-02.svg'
              alt='PDF password watermark and ZIP output'
              width={800}
              height={400}
              className='h-auto w-full object-contain'
            />
          </div>
        </SubSection>

        <SubSection title='Security & Encryption'>
          <p className='mb-4 text-[13px] font-normal leading-snug text-default-500'>
            Protect your generated PDF files with a password. This uses standard PDF encryption which prevents
            unauthorized viewing.
          </p>
          <PropertyTable
            data={[
              {
                name: 'pdfPassword.userPassword',
                type: 'string',
                required: false,
                desc: 'Password required to open the generated PDF.',
                plan: 'pro'
              },
              {
                name: 'pdfPassword.ownerPassword',
                type: 'string',
                required: false,
                desc: 'Owner password used to apply PDF permission restrictions.',
                plan: 'pro'
              },
              {
                name: 'restrictPrinting',
                type: 'boolean',
                required: false,
                desc: 'Disallow printing when supported by the PDF reader.',
                plan: 'pro'
              },
              {
                name: 'restrictCopying',
                type: 'boolean',
                required: false,
                desc: 'Disallow copying text or images when supported by the PDF reader.',
                plan: 'pro'
              },
              {
                name: 'restrictModifying',
                type: 'boolean',
                required: false,
                desc: 'Disallow modifying the PDF when supported by the PDF reader.',
                plan: 'pro'
              }
            ]}
          />
        </SubSection>

        <SubSection title='Branding & Watermarking'>
          <p className='mb-4 text-[13px] font-normal leading-snug text-default-500'>
            Add a non-removable watermark text across all pages of the document.
          </p>
          <PropertyTable
            data={[
              {
                name: 'watermark.text',
                type: 'string',
                required: false,
                desc: 'Text to be displayed as a watermark (e.g. "CONFIDENTIAL").',
                plan: 'pro'
              },
              { name: 'fontSize', type: 'number', required: false, desc: 'Watermark font size.', plan: 'pro' },
              { name: 'fontFamily', type: 'string', required: false, desc: 'Font family name.', plan: 'pro' },
              {
                name: 'fontWeight',
                type: 'number',
                required: false,
                desc: 'Font weight, e.g. 400 or 700.',
                plan: 'pro'
              },
              { name: 'fontItalic', type: 'boolean', required: false, desc: 'Use italic font style.', plan: 'pro' },
              { name: 'color', type: 'string', required: false, desc: 'Watermark color.', plan: 'pro' },
              { name: 'opacity', type: 'number', required: false, desc: 'Opacity from 0 to 1.', plan: 'pro' },
              { name: 'rotation', type: 'number', required: false, desc: 'Rotation angle in degrees.', plan: 'pro' },
              {
                name: 'positionX',
                type: 'string',
                required: false,
                desc: 'Horizontal position, e.g. "center".',
                plan: 'pro'
              },
              {
                name: 'positionY',
                type: 'string',
                required: false,
                desc: 'Vertical position, e.g. "center".',
                plan: 'pro'
              },
              { name: 'pages', type: 'number[]', required: false, desc: 'Optional 1-based page list.', plan: 'pro' }
            ]}
          />
        </SubSection>

        <SubSection title='Output Packaging'>
          <PropertyTable
            data={[
              {
                name: 'zipOutput',
                type: 'boolean',
                required: false,
                desc: 'Return a ZIP archive instead of the raw generated file.'
              }
            ]}
          />
        </SubSection>

        <SubSection title='Data Payload'>
          <CodeSwitcher
            activeLang={activeLang}
            onLangChange={setActiveLang}
            examples={getFileSettingsExamples('template')}
          />
        </SubSection>
      </div>
    </div>
  )
}

// Backwards-compatible alias for TablesContent (used in [id].tsx)
export const TablesContent = TablesBasicContent
