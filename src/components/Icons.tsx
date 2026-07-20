import type { IconType } from 'react-icons'
import {
  FaArrowUpRightFromSquare,
  FaCalendarDays,
  FaCheck,
  FaChevronDown,
  FaCodePullRequest,
  FaEnvelope,
  FaFigma,
  FaFolderPlus,
  FaGear,
  FaGithub,
  FaGripVertical,
  FaLink,
  FaMoon,
  FaPen,
  FaPlus,
  FaRotate,
  FaSun,
  FaTrashCan,
  FaVideo,
  FaXmark,
} from 'react-icons/fa6'
import type { AppIconKey, AppShortcut } from '../types'

/** Standard size for icons inside UI buttons (ghost / icon / mini). */
export const BUTTON_ICON_SIZE = 14
/** Size for the Join meeting button icon. */
export const JOIN_ICON_SIZE = 16

type IconProps = {
  className?: string
  size?: number
}

function makeIcon(Icon: IconType) {
  return function FaIcon({ className, size = BUTTON_ICON_SIZE }: IconProps) {
    return <Icon className={className} size={size} aria-hidden />
  }
}

export const RefreshIcon = makeIcon(FaRotate)
export const SettingsIcon = makeIcon(FaGear)
export const ExternalLinkIcon = makeIcon(FaArrowUpRightFromSquare)
export const PlusIcon = makeIcon(FaPlus)
export const FolderPlusIcon = makeIcon(FaFolderPlus)
export const GripIcon = makeIcon(FaGripVertical)
export const ChevronIcon = makeIcon(FaChevronDown)
export const GitPRIcon = makeIcon(FaCodePullRequest)
export const CalendarEventIcon = makeIcon(FaCalendarDays)
export const CloseIcon = makeIcon(FaXmark)
export const VideoIcon = makeIcon(FaVideo)
export const EditIcon = makeIcon(FaPen)
export const TrashIcon = makeIcon(FaTrashCan)
export const CheckIcon = makeIcon(FaCheck)
export const SunIcon = makeIcon(FaSun)
export const MoonIcon = makeIcon(FaMoon)

const brandIcons: Record<AppIconKey, IconType> = {
  gmail: FaEnvelope,
  calendar: FaCalendarDays,
  figma: FaFigma,
  github: FaGithub,
  link: FaLink,
}

const brandColors: Record<AppIconKey, string> = {
  gmail: '#EA4335',
  calendar: '#4285F4',
  figma: '#F24E1E',
  github: 'currentColor',
  link: 'currentColor',
}

export function AppBrandIcon({ icon, size = 22 }: { icon: AppIconKey; size?: number }) {
  const Icon = brandIcons[icon]
  return <Icon size={size} color={brandColors[icon]} aria-hidden />
}

export function AppIcon({ app, size = 22 }: { app: AppShortcut; size?: number }) {
  if (app.iconDataUrl) {
    return (
      <img
        className="app-icon-img"
        src={app.iconDataUrl}
        alt=""
        width={size}
        height={size}
        draggable={false}
      />
    )
  }
  return <AppBrandIcon icon={app.iconKey ?? 'link'} size={size} />
}
