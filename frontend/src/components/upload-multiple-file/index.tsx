import { cn } from '@/utils/cn'
import { Icon } from '@iconify/react'
import { Button, Image } from '@heroui/react'
import { SlideshowLightbox } from 'lightbox.js-react'
import React, { useState, useEffect, Fragment, useMemo } from 'react'
import Dropzone, { DropzoneOptions, FileRejection } from 'react-dropzone'
import 'lightbox.js-react/dist/index.css'
import { isImageFile } from '@/utils/upload-files/isImageFile'
import { formatFileSize } from '@/utils/upload-files/formatFileSize'
import { fileNameFromUrl } from '@/utils/upload-files/fileNameFormUrl'
import path from 'path'
import { getIconFileName } from '@/utils/upload-files/getIconFileName'

import { DndContext, closestCenter, MouseSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { restrictToParentElement } from '@dnd-kit/modifiers'
import { CSS } from '@dnd-kit/utilities'

interface FileObject {
  [key: string]: any
}

interface ErrorCategory {
  [category: string]: string[] // Each category is a list of error messages.
}

interface TransformedImagesType {
  isDefaultFile: boolean
  order: number
  src: string
  fileName: string | null | undefined
  isImage: boolean
  fileSize: number | null | undefined
}

interface UploadMultipleFileProps<T> {
  defaultFiles: T[] | []
  srcImage?: (file: T) => string | undefined | null
  fileName?: (file: T) => string | undefined | null
  fileSize?: (file: T) => number | undefined | null
  orderKey: keyof T
  isDrag: boolean
  onSelectFiles?: (files: { order: number; file: File }[]) => void
  onRemoveDefaultFiles?: (value: T[]) => void
  onChangeOrderDefaultFiles?: (value: T[]) => void
  dropzoneContent?: React.ReactNode
  dropzoneClassName?: string
  contentClassName?: string
  dropzoneOptions?: DropzoneOptions
  hiddenDropzone?: boolean
  maxTotalSize?: number
}

const UploadMultipleFile = <T extends FileObject>({
  defaultFiles = [],
  srcImage = file => file?.src,
  fileName = file => file?.alt,
  fileSize = file => file?.fileSize,
  orderKey,
  isDrag,
  onSelectFiles,
  onRemoveDefaultFiles,
  onChangeOrderDefaultFiles,
  dropzoneClassName,
  contentClassName,
  dropzoneContent,
  dropzoneOptions,
  hiddenDropzone,
  maxTotalSize
}: UploadMultipleFileProps<T>) => {
  const [errors, setErrors] = useState<ErrorCategory>({})
  const [initFiles, setInitFiles] = useState<T[]>([])
  const [uploadedFiles, setUploadedFiles] = useState<{ order: number; file: File }[]>([])
  const [deleteFiles, setDeleteFiles] = useState<T[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [startingIndex, setStartingIndex] = useState(0)

  useEffect(() => {
    setInitFiles(defaultFiles)
    setUploadedFiles([])
    setDeleteFiles([])
  }, [defaultFiles])

  const transformedDefaultImages = useMemo<TransformedImagesType[]>(() => {
    return initFiles.map(item => ({
      isDefaultFile: true,
      order: item[orderKey] as number,
      src: srcImage(item) || '',
      fileName: fileName(item),
      isImage: isImageFile(fileNameFromUrl(srcImage(item) || '')),
      fileSize: fileSize(item)
    }))
  }, [initFiles, srcImage, fileName, fileSize, orderKey])

  const transformedSelectImages = useMemo<TransformedImagesType[]>(() => {
    return uploadedFiles.map(item => ({
      isDefaultFile: false,
      order: item.order,
      src: URL.createObjectURL(item.file),
      fileName: item.file.name,
      isImage: item.file.type.startsWith('image/'),
      fileSize: item.file.size
    }))
  }, [uploadedFiles])

  const transformedImages = useMemo<TransformedImagesType[]>(() => {
    const transformedFilesList = [...transformedDefaultImages, ...transformedSelectImages].sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0)
    )
    return transformedFilesList
  }, [transformedDefaultImages, transformedSelectImages])

  const handleUploadFiles = (fileList: File[], rejectedFiles: FileRejection[]) => {
    // Initialize an object to hold categorized errors
    let errorCategories: ErrorCategory = {
      duplicateFiles: [],
      oversizedFiles: [],
      unsupportedFiles: [],
      maxFilesExceeded: [],
      maxTotalSizeExceeded: []
    }

    // Check for duplicate filenames
    const existingFileNames = [
      ...initFiles.map(file => fileName(file)),
      ...uploadedFiles.map(item => item.file.name)
    ].filter(Boolean)

    const duplicateFiles = fileList.filter(file => existingFileNames.includes(file.name))
    if (duplicateFiles.length > 0) {
      duplicateFiles.forEach(file => {
        errorCategories.duplicateFiles.push(`Duplicate file name: "${file.name}"`)
      })
    }

    if (dropzoneOptions) {
      if (
        dropzoneOptions.maxFiles &&
        fileList.length + uploadedFiles.length + initFiles.length > dropzoneOptions.maxFiles
      ) {
        errorCategories.maxFilesExceeded.push(`You can upload a maximum of ${dropzoneOptions.maxFiles} files`)
      }

      rejectedFiles.forEach(rejection => {
        rejection.errors.forEach(error => {
          if (error.code === 'file-too-large') {
            errorCategories.oversizedFiles.push(
              `File size exceeded: "${rejection.file.name}" is larger than ${formatFileSize(dropzoneOptions?.maxSize || 0)}`
            )
          }
          if (error.code === 'file-invalid-type') {
            errorCategories.unsupportedFiles.push(`Unsupported file type: "${rejection.file.name}"`)
          }
        })
      })
    }

    // Check total size against maxTotalSize
    if (maxTotalSize) {
      const existingTotalSize =
        uploadedFiles.reduce((acc, curr) => acc + curr.file.size, 0) +
        initFiles.reduce((acc, curr) => acc + (fileSize(curr) || 0), 0)
      const newFilesTotalSize = fileList.reduce((acc, curr) => acc + curr.size, 0)
      const totalSize = existingTotalSize + newFilesTotalSize

      if (totalSize > maxTotalSize) {
        errorCategories.maxTotalSizeExceeded.push(
          `Total file size exceeded: ${formatFileSize(totalSize)}, limit is ${formatFileSize(maxTotalSize)}`
        )
      }
    }

    // Set the categorized errors or clear errors if no errors exist
    if (
      errorCategories.duplicateFiles.length > 0 ||
      errorCategories.oversizedFiles.length > 0 ||
      errorCategories.unsupportedFiles.length > 0 ||
      errorCategories.maxFilesExceeded.length > 0 ||
      errorCategories.maxTotalSizeExceeded.length > 0
    ) {
      setErrors(errorCategories)
      return
    }

    let formatFileList: { order: number; file: File }[] = []
    fileList.forEach((file, index) => {
      formatFileList.push({ file: file, order: transformedImages.length + index })
    })

    const newFiles = [...uploadedFiles, ...formatFileList]
    setUploadedFiles(newFiles)
    onSelectFiles && onSelectFiles(newFiles)

    setErrors({})
  }

  const updateFileOrders = (allItems: TransformedImagesType[]) => {
    const filteredInitFiles = initFiles.filter(initItem => allItems.some(item => item.fileName === fileName(initItem)))
    const filteredUploadedFiles = uploadedFiles.filter(initItem =>
      allItems.some(item => item.fileName === initItem.file.name)
    )

    allItems.forEach((item, index) => {
      if (item.isDefaultFile) {
        // Update order in initFiles
        const initFileIndex = filteredInitFiles.findIndex(itemInit => fileName(itemInit) === item.fileName)
        if (initFileIndex !== -1) {
          filteredInitFiles[initFileIndex] = {
            ...filteredInitFiles[initFileIndex],
            [orderKey]: index
          }
        }
      } else {
        // Update order in uploadedFiles
        const uploadedFileIndex = filteredUploadedFiles.findIndex(uploaded => uploaded.file.name === item.fileName)
        if (uploadedFileIndex !== -1) {
          filteredUploadedFiles[uploadedFileIndex] = {
            ...filteredUploadedFiles[uploadedFileIndex],
            order: index
          }
        }
      }
    })

    setInitFiles(filteredInitFiles)
    setUploadedFiles(filteredUploadedFiles)
    onChangeOrderDefaultFiles && onChangeOrderDefaultFiles(filteredInitFiles)
    onSelectFiles && onSelectFiles(filteredUploadedFiles)
  }

  const handleRemoveFiles = (file: TransformedImagesType) => {
    const allItems = transformedImages.filter(item => item.order !== file.order)
    updateFileOrders(allItems)

    if (file.isDefaultFile) {
      const delFile = initFiles.find(item => item[orderKey] === file.order)
      if (delFile) {
        const delFileList = [...deleteFiles, delFile]
        onRemoveDefaultFiles && onRemoveDefaultFiles(delFileList)
      }
    }
  }

  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 10 // Drag will only activate if moved 10 pixels or more
    }
  })

  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      distance: 10 // Same for touch devices
    }
  })

  const sensors = useSensors(mouseSensor, touchSensor)

  const handleDragEnd = (event: any) => {
    const { active, over } = event

    if (active.id !== over.id) {
      const oldIndex = transformedImages.findIndex(item => item.fileName === active.id)
      const newIndex = transformedImages.findIndex(item => item.fileName === over.id)
      const newAllItems = arrayMove(transformedImages, oldIndex, newIndex)

      updateFileOrders(newAllItems)
    }
  }

  return (
    <Fragment>
      {/* Dropzone Section Remains Unchanged */}
      {!hiddenDropzone && (
        <Dropzone onDrop={handleUploadFiles} {...dropzoneOptions}>
          {({ getRootProps, getInputProps, open }) => (
            <section>
              <div {...getRootProps()} className='w-full'>
                <input {...getInputProps()} />
                <div
                  className={cn(
                    'flex flex-col items-center justify-center gap-2',
                    'rounded-xl border-2 border-dashed border-default-200 text-default-500',
                    'h-52 cursor-pointer py-5',
                    dropzoneClassName
                  )}>
                  {dropzoneContent || (
                    <Fragment>
                      <Icon icon='lucide:upload' width={25} />
                      <Button onClick={open}>Upload File</Button>
                      <p className='text-sm'>or Drag and Drop</p>
                    </Fragment>
                  )}
                </div>
              </div>
            </section>
          )}
        </Dropzone>
      )}
      {/* Error Message Remains Unchanged */}
      {Object.keys(errors).length > 0 && (
        <div className='mt-2 rounded-lg bg-danger/10 p-5 text-danger'>
          <p className='text-lg font-semibold'>Uploaded files do not meet the following conditions</p>
          <ul className='list-disc pl-5 text-sm'>
            {Object.entries(errors).map(([category, messages]) => (
              <Fragment key={category}>
                {messages.length > 0 && (
                  <li>
                    <p className='font-semibold uppercase'>{category}:</p>
                    <ul className='list-disc pl-5'>
                      {messages.map((message, index) => (
                        <li key={index}>{message}</li>
                      ))}
                    </ul>
                  </li>
                )}
              </Fragment>
            ))}
          </ul>
        </div>
      )}

      <SlideshowLightbox
        lightboxIdentifier='lightBoxUploadMultipleFile'
        images={transformedImages.filter(file => file.isImage)}
        open={isOpen}
        startingSlideIndex={startingIndex}
        showThumbnails={true}
        onClose={() => setIsOpen(false)}
        modalClose={'clickOutside'}
        backgroundColor='rgba(255, 255, 255, 0.8)'
      />

      {/* Draggable and Sortable List */}
      <DndContext
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToParentElement]}
        sensors={sensors}>
        <SortableContext
          items={transformedImages.map(file => file.fileName || file.order?.toString())}
          strategy={verticalListSortingStrategy}
          disabled={!isDrag}>
          <div className={cn('mt-5 flex flex-col gap-2', contentClassName)}>
            {transformedImages.length > 0 &&
              transformedImages.map((file, index) => (
                <SortableItem
                  key={file.fileName || index.toString()}
                  id={file.fileName || file.order?.toString()}
                  index={index}
                  file={file}
                  onRemove={() => handleRemoveFiles(file)}
                  setIsOpen={setIsOpen}
                  setStartingIndex={setStartingIndex}
                  disableDrag={!isDrag}
                />
              ))}
          </div>
        </SortableContext>
      </DndContext>
    </Fragment>
  )
}

interface SortableItemProps {
  id: string
  index: number
  file: TransformedImagesType
  onRemove: () => void
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>
  setStartingIndex: React.Dispatch<React.SetStateAction<number>>
  disableDrag: boolean
}

const SortableItem = ({
  id,
  index,
  file,
  onRemove,
  setIsOpen,
  setStartingIndex,
  disableDrag = true
}: SortableItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  }

  const isImage = file.isImage

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(!disableDrag && { ...attributes, ...listeners })}
      className='flex items-center justify-between gap-4 hover:bg-default/15'>
      <div
        className={cn('flex flex-1 items-center gap-2 hover:opacity-80', isImage && 'cursor-pointer')}
        onClick={() => {
          if (isImage) {
            setIsOpen(true)
            setStartingIndex(index)
          }
        }}>
        {!disableDrag && <Icon icon='akar-icons:drag-vertical' width={20} />}
        {isImage ? (
          <Image
            src={file.src || '/images/@mock/300x200.jpg'}
            alt={file.fileName || ''}
            radius='sm'
            className='h-11 w-14 object-cover'
          />
        ) : (
          <Icon
            icon={file.fileName ? getIconFileName(file.fileName as string) : 'emojione-v1:warning'}
            width={40}
            className='w-14 text-primary'
          />
        )}
        <div className='flex flex-1 flex-col'>
          <p className='flex-1 truncate text-nowrap'>{file.fileName || 'Not specified'}</p>
          <div className='flex gap-1'>
            <Icon
              icon='solar:check-circle-bold-duotone'
              className={cn(file.isDefaultFile ? 'text-success' : 'text-default-400')}
            />
            <p className='text-sm text-default-500'>
              {file.fileSize ? formatFileSize(file.fileSize) : file.fileSize === 0 ? 'File not found' : 'Uploaded'}
            </p>
          </div>
        </div>
      </div>
      <Button size='sm' color='danger' variant='bordered' isIconOnly onPress={() => onRemove()}>
        <Icon icon='solar:close-square-bold' width={20} />
      </Button>
    </div>
  )
}

export default UploadMultipleFile
