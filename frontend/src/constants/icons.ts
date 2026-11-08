import {
  AlertIcon, ArrowLeftIcon, ArrowRightIcon, BellIcon, BookIcon, CheckCircleFillIcon, CheckCircleIcon, CheckIcon, ChecklistIcon, ChevronDownIcon,
  ChevronLeftIcon, ChevronRightIcon, ClockIcon, CommentDiscussionIcon, FlameIcon, GearIcon, GlobeIcon, GraphIcon, HomeIcon, InboxIcon, InfoIcon,
  LockIcon, MailIcon, MoonIcon, MortarBoardIcon, OrganizationIcon, PaperAirplaneIcon, PencilIcon, PeopleIcon, PersonIcon, PlayIcon, PlusIcon,
  RocketIcon, SearchIcon, ShieldLockIcon, SignOutIcon, StarFillIcon, StarIcon, SunIcon, SyncIcon, ThreeBarsIcon, TrashIcon, TrophyIcon,
  UnlockIcon, VideoIcon, XIcon, ZapIcon, type Icon as Octicon,
} from "@primer/octicons-react";

/** Platform icons: GitHub's Octicons only (TMCL-PR rule: no emoji as icons). Add an entry here before using a new one. */
export const ICON = {
  alert: AlertIcon, arrowLeft: ArrowLeftIcon, arrowRight: ArrowRightIcon, bell: BellIcon, book: BookIcon, checkCircle: CheckCircleIcon,
  checkCircleFill: CheckCircleFillIcon, check: CheckIcon, checklist: ChecklistIcon, chevronDown: ChevronDownIcon, chevronLeft: ChevronLeftIcon,
  chevronRight: ChevronRightIcon, clock: ClockIcon, comment: CommentDiscussionIcon, flame: FlameIcon, gear: GearIcon, globe: GlobeIcon,
  graph: GraphIcon, home: HomeIcon, inbox: InboxIcon, info: InfoIcon, lock: LockIcon, mail: MailIcon, moon: MoonIcon, mortarBoard: MortarBoardIcon,
  organization: OrganizationIcon, paperAirplane: PaperAirplaneIcon, pencil: PencilIcon, people: PeopleIcon, person: PersonIcon, play: PlayIcon,
  plus: PlusIcon, rocket: RocketIcon, search: SearchIcon, shieldLock: ShieldLockIcon, signOut: SignOutIcon, starFill: StarFillIcon, star: StarIcon,
  sun: SunIcon, sync: SyncIcon, threeBars: ThreeBarsIcon, trash: TrashIcon, trophy: TrophyIcon, unlock: UnlockIcon, video: VideoIcon, x: XIcon,
  zap: ZapIcon,
} satisfies Record<string, Octicon>;

export type IconName = keyof typeof ICON;

/** Status tone → colour tokens (styles/tokens.css). */
export const TONE = {
  accent: { fg: "var(--color-accent-800)", bg: "var(--color-accent-100)", solid: "var(--color-accent)" },
  ok: { fg: "var(--tone-ok-fg)", bg: "var(--tone-ok-bg)", solid: "var(--tone-ok-solid)" },
  warn: { fg: "var(--tone-warn-fg)", bg: "var(--tone-warn-bg)", solid: "var(--tone-warn-solid)" },
  stop: { fg: "var(--tone-stop-fg)", bg: "var(--tone-stop-bg)", solid: "var(--tone-stop-solid)" },
  neutral: { fg: "var(--color-neutral-700)", bg: "var(--color-neutral-100)", solid: "var(--color-neutral-400)" },
} as const;
