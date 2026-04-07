import Image from 'next/image'
import React from 'react'

import { CodeSwitcher, useSharedLanguage } from './CodeSwitcher'
import { Highlight, PropertyTable, SubSection, ProChip } from './DocComponents'
import { getImageExamples, getQrExamples, getTableExamples, getVariableExamples, getBarcodeExamples } from './examples'

export const VariablesContent = () => {
  const [activeLang, setActiveLang] = useSharedLanguage()
  return (
    <div>
      <p className='mb-6 text-default-600'>
        Use <Highlight>{`{{variable}}`}</Highlight> in your Word document to define placeholders.
      </p>

      <div className='grid grid-cols-1 gap-8'>
        <div>
          <SubSection title='Template (.docx)'>
            <div className='relative overflow-hidden rounded-lg border border-default-200'>
              <Image
                src='/images/docs/variable-01.png'
                alt='Variables in Word'
                width={800}
                height={400}
                className='h-auto w-full object-contain'
              />
            </div>
          </SubSection>
        </div>
        <div>
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
    </div>
  )
}

export const TablesBasicContent = () => {
  const [activeLang, setActiveLang] = useSharedLanguage()
  return (
    <div>
      <p className='mb-6 text-default-600'>
        Create dynamic tables using <Highlight>{`{{variable}}`}</Highlight> markers. The API expects an array of table
        objects, where each table contains rows.
      </p>

      <SubSection title='Template (.docx)'>
        <div className='grid grid-cols-1 gap-8'>
          <div>
            <p className='mt-2 text-sm text-default-500'>
              * Note: The row with <code>{`{{table:product}}`}</code> marks the start of the table loop.
            </p>
            <div className='relative overflow-hidden rounded-xl border border-default-200'>
              <Image
                src='/images/docs/table-01.png'
                alt='Table in Word'
                width={800}
                height={400}
                className='h-auto w-full object-contain'
              />
            </div>
          </div>
          <div>
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
        </div>
      </SubSection>

      <div className='mt-8'>
        <CodeSwitcher
          activeLang={activeLang}
          onLangChange={setActiveLang}
          examples={getTableExamples('template')}
        />
      </div>
    </div>
  )
}

export const TablesAdvancedContent = () => {
  return (
    <div>
      <div className='mb-6 text-default-600'>
        Advanced table features including sorting, grouping, vertical merge, collapse, and aggregates.
        These features require a <ProChip /> plan.
      </div>

      <SubSection title='Advanced Properties'>
        <PropertyTable
          data={[
            {
              name: 'sort',
              type: 'Record<string, "asc" | "desc">',
              required: false,
              plan: 'pro',
              desc: 'Sorting rules (e.g. { "price": "desc" }).'
            },
            {
              name: 'verticalMerge',
              type: 'string[]',
              required: false,
              plan: 'pro',
              desc: (
                <div className='flex flex-col gap-1'>
                  <span>Merges cells with identical values vertically.</span>
                  <span className='text-xs text-default-400'>{`ex. ["category", "date"]`}</span>
                </div>
              )
            },
            {
              name: 'collapse',
              type: 'string[]',
              required: false,
              plan: 'pro',
              desc: (
                <div className='flex flex-col gap-1'>
                  <span>Collapses identical rows into a single row.</span>
                  <span className='text-xs text-default-400'>{`ex. ["date", "store_branch"]`}</span>
                </div>
              )
            }
          ]}
        />
      </SubSection>

      <div className='flex flex-col gap-8'>
        <SubSection
          title={
            <div className='flex items-center gap-2'>
              <span>Template Grouping Styles</span>
              <ProChip />
            </div>
          }>
          <div className='flex flex-col gap-6'>
            <div className='flex min-w-0 flex-col rounded-xl border border-default-200 bg-content2 p-4'>
              <h5 className='mb-2 text-sm font-semibold text-foreground'>Header Row Grouping</h5>
              <p className='mb-3 text-xs text-default-600'>
                Place the Header row <strong className='text-foreground'>above</strong> the data row to display a group
                header (used in conjunction with the first <code>verticalMerge</code> item).
              </p>
              <div className='mt-auto overflow-x-auto rounded-lg border border-default-200 bg-content1'>
                <table className='w-full min-w-max text-left text-[10px] sm:text-[11px]'>
                  <thead className='bg-content3 text-default-600'>
                    <tr>
                      <th className='whitespace-nowrap border-r border-default-200 p-2 font-medium'>Item Name</th>
                      <th className='whitespace-nowrap border-r border-default-200 p-2 font-medium'>Qty</th>
                      <th className='whitespace-nowrap p-2 font-medium'>Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className='bg-default-600/5'>
                      <td className='whitespace-nowrap p-2 font-bold text-default-600' colSpan={3}>
                        Category: {'{{group:category}}'} ({'{{group_count}}'} items)
                      </td>
                    </tr>
                    <tr className='border-t border-default-100'>
                      <td className='whitespace-nowrap border-r border-default-200 p-2'>{'{{row:name}}'}</td>
                      <td className='whitespace-nowrap border-r border-default-200 p-2'>{'{{row:qty}}'}</td>
                      <td className='whitespace-nowrap p-2'>{'{{row:price}}'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className='mt-3 text-[10px] text-default-500'>
                <strong className='text-foreground'>Note:</strong> Use the <code>{`{{group:field}}`}</code> marker in the
                Header Row to indicate where the group name will be displayed.
              </p>
            </div>

            <div className='flex min-w-0 flex-col rounded-xl border border-default-200 bg-content2 p-4'>
              <h5 className='mb-2 text-sm font-semibold text-foreground'>Footer Grouping</h5>
              <p className='mb-3 text-xs text-default-600'>
                Place a summary row <strong className='text-foreground'>below</strong> the data row to show the total at
                the end of each group.
              </p>
              <div className='overflow-x-auto rounded-lg border border-default-200 bg-content1'>
                <table className='w-full min-w-max text-left text-[10px] sm:text-[11px]'>
                  <thead className='sr-only'>
                    <tr>
                      <th>Item Name</th>
                      <th>Qty</th>
                      <th>Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className='whitespace-nowrap border-r border-default-200 p-2'>{'{{row:name}}'}</td>
                      <td className='whitespace-nowrap border-r border-default-200 p-2'>{'{{row:qty}}'}</td>
                      <td className='whitespace-nowrap p-2'>{'{{row:price}}'}</td>
                    </tr>
                    <tr className='border-t border-default-200 bg-default-600/5 font-medium'>
                      <td className='whitespace-nowrap border-r border-default-600/20 p-2 font-bold text-default-600'>
                        Total for {'{{group:category}}'}
                      </td>
                      <td className='whitespace-nowrap border-r border-default-600/20 p-2 font-bold text-default-600'>
                        {'{{group_sum:qty}}'}
                      </td>
                      <td className='whitespace-nowrap p-2 font-bold text-default-600'>Total {'{{group_sum:price}}'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </SubSection>

        <SubSection
          title={
            <div className='flex items-center gap-2'>
              <span>Aggregates</span>
              <ProChip />
            </div>
          }>
          <div className='grid grid-cols-1 gap-6 md:grid-cols-3'>
            <div className='flex flex-col gap-2'>
              <h6 className='mb-1.5 text-xs font-semibold text-foreground'>Table Scope</h6>
              <p className='mb-2 text-[10px] text-default-500'>Used to display the grand totals for the entire table.</p>
              <div className='flex flex-col gap-2 rounded-lg border border-default-100 bg-content1 p-3'>
                <div className='flex items-center justify-between gap-2'>
                  <code className='rounded bg-content3 px-1.5 py-0.5 font-mono text-[10px] font-medium text-default-600'>
                    {'{{table_count}}'}
                  </code>
                  <span className='text-[10px] text-default-600'>Total item count</span>
                </div>
                <div className='flex items-center justify-between gap-2'>
                  <code className='rounded bg-content3 px-1.5 py-0.5 font-mono text-[10px] font-medium text-default-600'>
                    {'{{table_sum:field}}'}
                  </code>
                  <span className='text-[10px] text-default-600'>Grand total sum</span>
                </div>
                <div className='flex items-center justify-between gap-2'>
                  <code className='rounded bg-content3 px-1.5 py-0.5 font-mono text-[10px] font-medium text-default-600'>
                    {'{{table_avg:field}}'}
                  </code>
                  <span className='text-[10px] text-default-600'>Grand total average</span>
                </div>
              </div>
            </div>

            <div className='flex flex-col gap-2'>
              <h6 className='mb-1.5 text-xs font-semibold text-foreground'>Group Scope</h6>
              <p className='mb-2 text-[10px] text-default-500'>
                Used in the <strong>Group Header</strong> or <strong>Group Footer</strong>.
              </p>
              <div className='flex flex-col gap-2 rounded-lg border border-default-100 bg-content1 p-3'>
                <div className='flex items-center justify-between gap-2'>
                  <code className='rounded bg-content3 px-1.5 py-0.5 font-mono text-[10px] font-medium text-default-600'>
                    {'{{group_count}}'}
                  </code>
                  <span className='text-[10px] text-default-600'>Group item count</span>
                </div>
                <div className='flex items-center justify-between gap-2'>
                  <code className='rounded bg-content3 px-1.5 py-0.5 font-mono text-[10px] font-medium text-default-600'>
                    {'{{group_sum:field}}'}
                  </code>
                  <span className='text-[10px] text-default-600'>Group subtotal sum</span>
                </div>
                <div className='flex items-center justify-between gap-2'>
                  <code className='rounded bg-content3 px-1.5 py-0.5 font-mono text-[10px] font-medium text-default-600'>
                    {'{{group_avg:field}}'}
                  </code>
                  <span className='text-[10px] text-default-600'>Group subtotal average</span>
                </div>
              </div>
            </div>

            <div className='flex flex-col gap-2'>
              <h6 className='mb-1.5 text-xs font-semibold text-foreground'>Row Scope</h6>
              <p className='mb-2 text-[10px] text-default-500'>
                Used to calculate values between fields in the same row.
              </p>
              <div className='flex flex-col gap-2 rounded-lg border border-default-100 bg-content1 p-3'>
                <div className='flex items-center justify-between gap-2'>
                  <code className='rounded bg-content3 px-1.5 py-0.5 font-mono text-[10px] font-medium text-default-600'>
                    {'{{row_sum:f1,f2}}'}
                  </code>
                  <span className='text-[10px] text-default-600'>Sum of specific fields</span>
                </div>
                <div className='flex items-center justify-between gap-2'>
                  <code className='rounded bg-content3 px-1.5 py-0.5 font-mono text-[10px] font-medium text-default-600'>
                    {'{{row_avg:f1,f2}}'}
                  </code>
                  <span className='text-[10px] text-default-600'>Average of specific fields</span>
                </div>
              </div>
            </div>
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
      <p className='mb-6 text-default-600'>
        Insert images dynamically using <Highlight>{`{{image:variable}}`}</Highlight>.
      </p>

      <div className='grid grid-cols-1 gap-8'>
        <div>
          <SubSection title='Template (.docx)'>
            <div className='relative overflow-hidden rounded-lg border border-default-200'>
              <Image
                src='/images/docs/images-01.png'
                alt='Images in Word'
                width={800}
                height={400}
                className='h-auto w-full object-contain'
              />
            </div>
          </SubSection>
        </div>
        <div>
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
    </div>
  )
}

export const QrCodesContent = () => {
  const [activeLang, setActiveLang] = useSharedLanguage()
  return (
    <div>
      <p className='mb-6 text-default-600'>
        Generate QR codes automatically with <Highlight>{`{{qrcode:variable}}`}</Highlight>.
      </p>

      <div className='grid grid-cols-1 gap-8'>
        <div>
          <SubSection title='Template (.docx)'>
            <div className='relative overflow-hidden rounded-lg border border-default-200'>
              <Image
                src='/images/docs/qrcode-01.png'
                alt='QR Code in Word'
                width={800}
                height={400}
                className='h-auto w-full object-contain'
              />
            </div>
          </SubSection>
        </div>
        <div>
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
    </div>
  )
}

export const BarcodesContent = () => {
  const [activeLang, setActiveLang] = useSharedLanguage()
  return (
    <div>
      <p className='mb-6 text-default-600'>
        Generate Barcodes automatically with <Highlight>{`{{barcode:variable}}`}</Highlight>.
      </p>

      <div className='grid grid-cols-1 gap-8'>
        <div>
          <SubSection title='Template (.docx)'>
            <div className='relative overflow-hidden rounded-lg border border-default-200'>
              <Image
                src='/images/docs/barcode-01.png'
                alt='Barcode in Word'
                width={800}
                height={400}
                className='h-auto w-full object-contain'
              />
            </div>
          </SubSection>
        </div>
        <div>
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
    </div>
  )
}

export const FileSettingsContent = () => {
  return (
    <div>
      <p className='mb-6 text-default-600'>
        Configure high-level document settings such as file protection and branding.
      </p>

      <div className='flex flex-col gap-8'>
        <SubSection title='Security & Encryption'>
          <p className='mb-4 text-sm text-default-500'>
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
          <p className='mb-4 text-sm text-default-500'>
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
