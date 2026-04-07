import { cn } from '@/utils/cn'
import { Icon } from '@iconify/react'
import { Button, Image } from '@heroui/react'
import { SlideshowLightbox } from 'lightbox.js-react'
import React, { useState, useEffect, Fragment, useMemo } from 'react'
import Dropzone, { DropzoneOptions } from 'react-dropzone'
import 'lightbox.js-react/dist/index.css'
import { isImageFile } from '@/utils/upload-files/isImageFile'
import { formatFileSize } from '@/utils/upload-files/formatFileSize'
import { fileNameFromUrl } from '@/utils/upload-files/fileNameFormUrl'

interface FileObject {
  [key: string]: any
}

interface UploadSingleFileProps<T> extends DropzoneOptions {
  defaultFile?: T | undefined | null
  onFileAccepted?: (file: File) => void
  srcImage?: (file: T) => string | undefined | null
  altImage?: (file: T) => string | undefined | null
}

const UploadSingleFile = <T extends FileObject>({
  defaultFile,
  onFileAccepted,
  srcImage = file => file?.src,
  altImage: getAlt = file => file?.alt,
  ...dropzoneProps
}: UploadSingleFileProps<T>) => {
  const [error, setError] = useState<string>('')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    setUploadedFile(null)
  }, [defaultFile])

  const transformedInitialImage = useMemo(() => {
    if (defaultFile) {
      return {
        src: srcImage(defaultFile) ?? '',
        alt: getAlt(defaultFile) ?? '',
        isImage: isImageFile(fileNameFromUrl(srcImage(defaultFile)) ?? '')
      }
    }
    return null
  }, [defaultFile, srcImage, getAlt])

  const transformedUploadedImage = useMemo(() => {
    if (uploadedFile) {
      return {
        src: URL.createObjectURL(uploadedFile) ?? '',
        alt: uploadedFile.name ?? '',
        isImage: uploadedFile.type.startsWith('image/')
      }
    }
    return null
  }, [uploadedFile])

  const transformedImage = useMemo(() => {
    return transformedUploadedImage || transformedInitialImage
  }, [transformedInitialImage, transformedUploadedImage])

  const handleUploadFile = (files: File[]) => {
    if (files.length > 1) {
      setError('Only one file can be uploaded')
      return
    }

    setError('')
    const file = files[0]
    setUploadedFile(file)
    onFileAccepted && onFileAccepted(file)
  }

  return (
    <Fragment>
      {/* Display uploaded and initial file */}
      {!transformedImage || (!transformedInitialImage?.src && !transformedUploadedImage) ? (
        <Dropzone onDrop={handleUploadFile} multiple={false} {...dropzoneProps}>
          {({ getRootProps, getInputProps, open }) => (
            <section>
              <div {...getRootProps()} className='w-fit'>
                <input {...getInputProps()} />
                <div
                  className={cn(
                    'flex flex-col items-center justify-center gap-2',
                    'rounded-xl border-2 border-dashed border-default-200 text-default-500',
                    'aspect-square h-40 cursor-pointer object-cover py-5 '
                  )}>
                  <Icon icon='lucide:upload' width={25} />
                  <Button onClick={open}>Upload File</Button>
                  <p className='text-sm'>or Drag and Drop</p>
                </div>
              </div>
            </section>
          )}
        </Dropzone>
      ) : (
        <Fragment>
          <SlideshowLightbox
            images={[transformedImage]}
            open={isOpen}
            startingSlideIndex={0}
            showThumbnails={true}
            onClose={() => setIsOpen(false)}
            lightboxIdentifier='lightBoxUploadSingleFile'
            backgroundColor='rgba(255, 255, 255, 0.8)'
          />
          <div className='flex w-40 flex-col gap-4'>
            <div>
              <Image
                src={transformedImage.src || '/images/@mock/300x200.jpg'}
                fallbackSrc={'/images/@mock/300x200.jpg'}
                alt={transformedImage.alt || ''}
                radius='sm'
                className='aspect-square h-40 object-cover'
                onClick={() => {
                  if (transformedImage.isImage) {
                    setIsOpen(true)
                  }
                }}
              />
            </div>
            <div className='flex w-40 items-center gap-2'>
              <div className='flex flex-1 flex-col'>
                <p className='flex-1 truncate text-nowrap'>{transformedImage.alt}</p>
                {uploadedFile ? (
                  <p className='text-sm text-default-500'>{formatFileSize(uploadedFile.size)}</p>
                ) : (
                  <p className='text-sm text-default-500'>Uploaded</p>
                )}
              </div>
              <Dropzone onDrop={handleUploadFile} multiple={false} {...dropzoneProps}>
                {({ getRootProps, getInputProps, open }) => (
                  <section>
                    <div {...getRootProps()} className='w-fit'>
                      <input {...getInputProps()} />
                      <Button size='sm' color='danger' variant='bordered' onPress={open}>
                        Change
                      </Button>
                    </div>
                  </section>
                )}
              </Dropzone>
            </div>
          </div>
        </Fragment>
      )}

      {/* Error Message */}
      {error && (
        <div>
          <p className='rounded-lg bg-danger/10 p-2 text-danger'>{error}</p>
        </div>
      )}
    </Fragment>
  )
}

export default UploadSingleFile
