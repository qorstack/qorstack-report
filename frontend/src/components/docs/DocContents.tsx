import Image from 'next/image'
import React from 'react'

import { CodeSwitcher, useSharedLanguage } from './CodeSwitcher'
import { Highlight, PropertyTable, SubSection } from './DocComponents'
import { getImageExamples, getQrExamples, getTableExamples, getVariableExamples, getBarcodeExamples } from './examples'

const introClass = 'mb-6 max-w-[65ch] text-[13px] leading-relaxed text-default-500'
const inlineCodeClass = 'rounded bg-content2 px-1.5 py-0.5 font-mono text-[12px] text-foreground'
const tokenClass = 'font-mono text-[12px] text-primary'
const imageFrameClass =
  'relative overflow-hidden rounded-md bg-content2 ring-1 ring-default-200 dark:ring-white/5'
const cardSurfaceClass = 'rounded-md bg-content2 ring-1 ring-default-200 dark:ring-white/5'

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
              src='/images/docs/variable-01.png'
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
        Create dynamic tables using <Highlight>{`{{variable}}`}</Highlight> markers. The API expects an array of table
        objects, where each table contains rows.
      </p>

      <SubSection title='Template (.docx)'>
        <div className='grid grid-cols-1 gap-4'>
          <p className='text-[11.5px] font-normal leading-snug text-default-500'>
            The row with <code className={inlineCodeClass}>{`{{table:product}}`}</code> marks the start of the table
            loop.
          </p>
          <div className={imageFrameClass}>
            <Image
              src='/images/docs/table-01.png'
              alt='Table in Word'
              width={800}
              height={400}
              className='h-auto w-full object-contain'
            />
          </div>
          <PropertyTable
            data={[
              { name: 'table', type: 'TableDataRequest[]', required: true, desc: 'Array of table data requests.' },
              {
                name: 'rows',
                type: 'Record<string, any>[]',
                required: true,
                desc: 'Array of row objects matching {{col:key}}.'
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
              type: 'Record<string, "asc" | "desc">',
              required: false,
              desc: 'Sorting rules (e.g. { "price": "desc" }).'
            },
            {
              name: 'verticalMerge',
              type: 'string[]',
              required: false,
              desc: (
                <div className='flex flex-col gap-1'>
                  <span>Merges cells with identical values vertically.</span>
                  <span className='text-[11.5px] text-default-500'>{`ex. ["category", "date"]`}</span>
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
                  <span className='text-[11.5px] text-default-500'>{`ex. ["date", "store_branch"]`}</span>
                </div>
              )
            }
          ]}
        />
      </SubSection>

      <div className='flex flex-col gap-6'>
        <SubSection title='Template Grouping Styles'>
          <div className='flex flex-col gap-4'>
            <div className={`${cardSurfaceClass} flex min-w-0 flex-col p-4`}>
              <h5 className='mb-2 text-[13px] font-bold tracking-tight text-foreground'>Header Row Grouping</h5>
              <p className='mb-3 text-[11.5px] font-normal leading-snug text-default-500'>
                Place the Header row <strong className='font-semibold text-foreground'>above</strong> the data row to
                display a group header (used in conjunction with the first{' '}
                <code className={inlineCodeClass}>verticalMerge</code> item).
              </p>
              <div className='mt-auto overflow-x-auto rounded-md bg-content1 ring-1 ring-default-200 dark:ring-white/5'>
                <table className='w-full min-w-max text-left text-[11px]'>
                  <thead className='bg-content2 text-default-600'>
                    <tr>
                      <th className='whitespace-nowrap border-r border-default-200 p-2 font-medium dark:border-white/5'>
                        Item Name
                      </th>
                      <th className='whitespace-nowrap border-r border-default-200 p-2 font-medium dark:border-white/5'>
                        Qty
                      </th>
                      <th className='whitespace-nowrap p-2 font-medium'>Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className='bg-primary/5'>
                      <td className={`whitespace-nowrap p-2 ${tokenClass}`} colSpan={3}>
                        Category: {'{{group:category}}'} ({'{{group_count}}'} items)
                      </td>
                    </tr>
                    <tr className='border-t border-default-200 dark:border-white/5'>
                      <td className={`whitespace-nowrap border-r border-default-200 p-2 dark:border-white/5 ${tokenClass}`}>
                        {'{{row:name}}'}
                      </td>
                      <td className={`whitespace-nowrap border-r border-default-200 p-2 dark:border-white/5 ${tokenClass}`}>
                        {'{{row:qty}}'}
                      </td>
                      <td className={`whitespace-nowrap p-2 ${tokenClass}`}>{'{{row:price}}'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className='mt-3 text-[11.5px] font-normal leading-snug text-default-500'>
                <strong className='font-semibold text-foreground'>Note:</strong> Use the{' '}
                <code className={inlineCodeClass}>{`{{group:field}}`}</code> marker in the Header Row to indicate where
                the group name will be displayed.
              </p>
            </div>

            <div className={`${cardSurfaceClass} flex min-w-0 flex-col p-4`}>
              <h5 className='mb-2 text-[13px] font-bold tracking-tight text-foreground'>Footer Grouping</h5>
              <p className='mb-3 text-[11.5px] font-normal leading-snug text-default-500'>
                Place a summary row <strong className='font-semibold text-foreground'>below</strong> the data row to
                show the total at the end of each group.
              </p>
              <div className='overflow-x-auto rounded-md bg-content1 ring-1 ring-default-200 dark:ring-white/5'>
                <table className='w-full min-w-max text-left text-[11px]'>
                  <thead className='sr-only'>
                    <tr>
                      <th>Item Name</th>
                      <th>Qty</th>
                      <th>Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className={`whitespace-nowrap border-r border-default-200 p-2 dark:border-white/5 ${tokenClass}`}>
                        {'{{row:name}}'}
                      </td>
                      <td className={`whitespace-nowrap border-r border-default-200 p-2 dark:border-white/5 ${tokenClass}`}>
                        {'{{row:qty}}'}
                      </td>
                      <td className={`whitespace-nowrap p-2 ${tokenClass}`}>{'{{row:price}}'}</td>
                    </tr>
                    <tr className='border-t border-default-200 bg-primary/5 font-medium dark:border-white/5'>
                      <td className='whitespace-nowrap border-r border-default-200 p-2 text-[12px] font-semibold text-foreground dark:border-white/5'>
                        Total for <span className={tokenClass}>{'{{group:category}}'}</span>
                      </td>
                      <td className={`whitespace-nowrap border-r border-default-200 p-2 dark:border-white/5 ${tokenClass}`}>
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

        <SubSection title='Aggregates'>
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
                <h6 className='mb-1 text-[13px] font-bold tracking-tight text-foreground'>{group.scope}</h6>
                <p className='mb-3 text-[11.5px] font-normal leading-snug text-default-500'>{group.desc}</p>
                <div className='flex flex-col gap-2'>
                  {group.rows.map(row => (
                    <div
                      key={row.token}
                      className='flex items-center justify-between gap-2 rounded-md bg-content1 px-2.5 py-1.5 ring-1 ring-default-200 dark:ring-white/5'>
                      <code className={tokenClass}>{row.token}</code>
                      <span className='text-[11px] text-default-500'>{row.desc}</span>
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
              src='/images/docs/images-01.png'
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
              { name: 'src', type: 'string', required: true, desc: 'Image URL or Base64 string.' },
              { name: 'width', type: 'number', required: false, desc: 'Image width (px).' },
              { name: 'height', type: 'number', required: false, desc: 'Image height (px).' },
              { name: 'fit', type: 'string', required: false, desc: 'Image fit: "cover", "contain", "fill".' }
            ]}
          />
          <CodeSwitcher
            activeLang={activeLang}
            onLangChange={setActiveLang}
            examples={getImageExamples('template')}
          />
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
              src='/images/docs/qrcode-01.png'
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
              { name: 'text', type: 'string', required: true, desc: 'Content to encode.' },
              { name: 'size', type: 'number', required: false, desc: 'QR code size (px) (default: 100).' }
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
              src='/images/docs/barcode-01.png'
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
              { name: 'text', type: 'string', required: true, desc: 'Content to encode.' },
              { name: 'width', type: 'number', required: false, desc: 'Barcode width (px).' },
              { name: 'height', type: 'number', required: false, desc: 'Barcode height (px).' }
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
  return (
    <div>
      <p className={introClass}>
        Configure high-level document settings such as file protection and branding.
      </p>

      <div className='flex flex-col gap-6'>
        <SubSection title='Security & Encryption'>
          <p className='mb-4 text-[11.5px] font-normal leading-snug text-default-500'>
            Protect your generated PDF files with a password. This uses standard PDF encryption which prevents
            unauthorized viewing.
          </p>
          <PropertyTable
            data={[
              {
                name: 'filePassword',
                type: 'string',
                required: false,
                desc: 'Password required to open the generated PDF.'
              }
            ]}
          />
        </SubSection>

        <SubSection title='Branding & Watermarking'>
          <p className='mb-4 text-[11.5px] font-normal leading-snug text-default-500'>
            Add a non-removable watermark text across all pages of the document.
          </p>
          <PropertyTable
            data={[
              {
                name: 'watermark',
                type: 'string',
                required: false,
                desc: 'Text to be displayed as a watermark (e.g. "CONFIDENTIAL").'
              }
            ]}
          />
        </SubSection>
      </div>
    </div>
  )
}

// Backwards-compatible alias for TablesContent (used in [id].tsx)
export const TablesContent = TablesBasicContent
