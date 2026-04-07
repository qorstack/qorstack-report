import React from 'react'
import { Icon } from '@iconify/react'
import ShowAlert, { ButtonCancle, ButtonSubmit, ShowAlertProps } from './ShowAlert'

const Alert = {
  message({
    icon,
    noIcon,
    color,
    content,
    size,
    onSubmit,
    labelSubmit,
    noButton,
    isDismissable,
    hideCloseButton
  }: ShowAlertProps & ButtonSubmit) {
    ShowAlert({
      icon: icon || <Icon icon='lucide:alert-circle' />,
      noIcon: noIcon,
      color: color || 'primary',
      content: content,
      size: size,
      onSubmit: onSubmit,
      labelSubmit: labelSubmit || 'Close',
      noButton: noButton,
      isDismissable: isDismissable,
      hideCloseButton: hideCloseButton
    })
  },
  error({
    icon,
    noIcon,
    color,
    content,
    size,
    onSubmit,
    labelSubmit,
    noButton,
    isDismissable,
    hideCloseButton
  }: ShowAlertProps & ButtonSubmit) {
    ShowAlert({
      icon: icon || <Icon icon='tabler:xbox-x' />,
      noIcon: noIcon,
      color: color || 'danger',
      content: content,
      size: size,
      onSubmit: onSubmit,
      labelSubmit: labelSubmit || 'Close',
      noButton: noButton,
      isDismissable: isDismissable,
      hideCloseButton: hideCloseButton
    })
  },
  warning({
    icon,
    noIcon,
    color,
    content,
    size,
    onSubmit,
    labelSubmit,
    noButton,
    isDismissable,
    hideCloseButton
  }: ShowAlertProps & ButtonSubmit) {
    ShowAlert({
      icon: icon || <Icon icon='clarity:warning-line' />,
      noIcon: noIcon,
      color: color || 'warning',
      content: content,
      size: size,
      onSubmit: onSubmit,
      labelSubmit: labelSubmit || 'Close',
      noButton: noButton,
      isDismissable: isDismissable,
      hideCloseButton: hideCloseButton
    })
  },
  success({
    icon,
    noIcon,
    color,
    content,
    size,
    onSubmit,
    labelSubmit,
    noButton,
    isDismissable,
    hideCloseButton
  }: ShowAlertProps & ButtonSubmit) {
    ShowAlert({
      icon: icon || <Icon icon='icon-park-outline:check-one' />,
      noIcon: noIcon,
      color: color || 'success',
      content: content,
      size: size,
      onSubmit: onSubmit,
      labelSubmit: labelSubmit || 'Close',
      noButton: noButton,
      isDismissable: isDismissable,
      hideCloseButton: hideCloseButton
    })
  },
  question({
    icon,
    noIcon,
    color,
    content,
    size,
    onCancle,
    labelCancle,
    onSubmit,
    labelSubmit,
    noButton,
    isDismissable,
    hideCloseButton
  }: ShowAlertProps & ButtonCancle & ButtonSubmit) {
    ShowAlert({
      icon: icon || <Icon icon='fluent:question-circle-12-regular' />,
      noIcon: noIcon,
      color: color || 'primary',
      content: content,
      size: size,
      onCancle: onCancle,
      labelCancle: labelCancle || 'Cancel',
      onSubmit: onSubmit,
      labelSubmit: labelSubmit || 'Confirm',
      noButton: noButton,
      isDismissable: isDismissable,
      hideCloseButton: hideCloseButton
    })
  }
}

export default Alert
