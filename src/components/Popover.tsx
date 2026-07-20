import {
  FloatingFocusManager,
  FloatingPortal,
  autoUpdate,
  flip,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useMergeRefs,
  useRole,
} from '@floating-ui/react'
import {
  cloneElement,
  isValidElement,
  useState,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react'

type PopoverProps = {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger: ReactElement<{ ref?: Ref<HTMLElement>; onClick?: (e: MouseEvent) => void }>
  children: ReactNode
  title?: string
  className?: string
  placement?: 'bottom-end' | 'bottom-start' | 'bottom' | 'top-end' | 'top-start'
}

export function Popover({
  open: controlledOpen,
  onOpenChange,
  trigger,
  children,
  title,
  className = '',
  placement = 'bottom-end',
}: PopoverProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const open = controlledOpen ?? uncontrolledOpen
  const setOpen = onOpenChange ?? setUncontrolledOpen

  const { refs, floatingStyles, context, isPositioned } = useFloating({
    open,
    onOpenChange: setOpen,
    placement,
    strategy: 'fixed',
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(6),
      flip({ padding: 12, fallbackAxisSideDirection: 'start' }),
      shift({ padding: 12 }),
    ],
  })

  const click = useClick(context)
  const dismiss = useDismiss(context)
  const role = useRole(context, { role: 'dialog' })
  const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss, role])

  const triggerRef =
    isValidElement(trigger) && 'ref' in trigger
      ? (trigger as ReactElement & { ref?: Ref<HTMLElement> }).ref
      : null
  const referenceRef = useMergeRefs([refs.setReference, triggerRef])

  return (
    <>
      {cloneElement(trigger, {
        ref: referenceRef,
        ...getReferenceProps({
          onClick: (e: MouseEvent) => {
            e.stopPropagation()
            trigger.props.onClick?.(e)
          },
        }),
      })}
      {open ? (
        <FloatingPortal>
          <FloatingFocusManager context={context} modal={false} initialFocus={-1}>
            <div
              ref={refs.setFloating}
              style={{
                ...floatingStyles,
                // Avoid top-left flash before Floating UI finishes measuring.
                visibility: isPositioned ? 'visible' : 'hidden',
                pointerEvents: isPositioned ? 'auto' : 'none',
              }}
              className={`popover${isPositioned ? ' is-positioned' : ''} ${className}`.trim()}
              {...getFloatingProps()}
            >
              {title ? <div className="popover-title">{title}</div> : null}
              {children}
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      ) : null}
    </>
  )
}
