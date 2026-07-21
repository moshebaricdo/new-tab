import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { faviconSourcesForUrl } from '../lib/favicon'
import { fileToIconDataUrl } from '../lib/icons'
import { createId } from '../lib/storage'
import type { AppShortcut, FolderLink, ShortcutFolder } from '../types'
import {
  AppIcon,
  CheckIcon,
  ChevronIcon,
  EditIcon,
  FolderPlusIcon,
  GripIcon,
  PlusIcon,
  TrashIcon,
} from './Icons'
import { Popover } from './Popover'

type Props = {
  apps: AppShortcut[]
  folders: ShortcutFolder[]
  onChangeApps: (apps: AppShortcut[]) => void
  onChangeFolders: (folders: ShortcutFolder[]) => void
}

export function Shortcuts({ apps, folders, onChangeApps, onChangeFolders }: Props) {
  const [editingApps, setEditingApps] = useState(false)
  const [newAppOpen, setNewAppOpen] = useState(false)
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null)
  const [newFolderOpen, setNewFolderOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [fadeTop, setFadeTop] = useState(false)
  const [fadeBottom, setFadeBottom] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const folderSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  const activeFolder = useMemo(
    () => folders.find((f) => f.id === activeFolderId) ?? null,
    [folders, activeFolderId],
  )

  const updateFades = useCallback(() => {
    const el = scrollRef.current
    if (!el) {
      setFadeTop(false)
      setFadeBottom(false)
      return
    }
    const { scrollTop, scrollHeight, clientHeight } = el
    const canScroll = scrollHeight > clientHeight + 1
    setFadeTop(canScroll && scrollTop > 2)
    setFadeBottom(canScroll && scrollTop + clientHeight < scrollHeight - 2)
  }, [])

  useEffect(() => {
    updateFades()
    const el = scrollRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => updateFades())
    ro.observe(el)
    if (el.firstElementChild) ro.observe(el.firstElementChild)
    return () => ro.disconnect()
  }, [folders, updateFades])

  function updateFolder(id: string, patch: Partial<ShortcutFolder>) {
    onChangeFolders(folders.map((f) => (f.id === id ? { ...f, ...patch } : f)))
  }

  function onFolderDragStart(event: DragStartEvent) {
    setActiveFolderId(String(event.active.id))
  }

  function onFolderDragEnd(event: DragEndEvent) {
    setActiveFolderId(null)
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = folders.findIndex((f) => f.id === active.id)
    const newIndex = folders.findIndex((f) => f.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    onChangeFolders(arrayMove(folders, oldIndex, newIndex))
  }

  function createFolder() {
    const name = newFolderName.trim()
    if (!name) return
    onChangeFolders([
      ...folders,
      { id: createId('folder'), name, links: [], collapsed: false },
    ])
    setNewFolderName('')
    setNewFolderOpen(false)
  }

  return (
    <section className="shortcuts">
      <div className="section-head">
        <h2 className="section-title">Apps</h2>
        <div className="section-actions">
          <Popover
            open={newAppOpen}
            onOpenChange={setNewAppOpen}
            placement="bottom-end"
            title="Add app"
            trigger={
              <button type="button" className="icon-btn" aria-label="Add app" title="Add app">
                <PlusIcon />
              </button>
            }
          >
            <AppEditForm
              mode="create"
              onSave={(app) => {
                onChangeApps([...apps, app])
                setNewAppOpen(false)
              }}
              onCancel={() => setNewAppOpen(false)}
            />
          </Popover>
          <button
            type="button"
            className={`icon-btn${editingApps ? ' is-active' : ''}`}
            onClick={() => setEditingApps((v) => !v)}
            aria-label={editingApps ? 'Done editing apps' : 'Edit apps'}
            title={editingApps ? 'Done' : 'Edit apps'}
          >
            {editingApps ? <CheckIcon /> : <EditIcon />}
          </button>
        </div>
      </div>

      <AppsRow
        apps={apps}
        editing={editingApps}
        onChange={onChangeApps}
      />

      <div className="section-head shortcuts-folders-head">
        <h2 className="section-title">Shortcuts</h2>
        <div className="section-actions">
          <Popover
            open={newFolderOpen}
            onOpenChange={setNewFolderOpen}
            placement="bottom-end"
            title="New folder"
            trigger={
              <button
                type="button"
                className="icon-btn"
                aria-label="New folder"
                title="New folder"
              >
                <FolderPlusIcon />
              </button>
            }
          >
            <form
              className="popover-form"
              onSubmit={(e) => {
                e.preventDefault()
                createFolder()
              }}
            >
              <div className="field">
                <label htmlFor="new-folder-name">Name</label>
                <input
                  id="new-folder-name"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Figma files"
                  autoFocus
                />
              </div>
              <div className="popover-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setNewFolderOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={!newFolderName.trim()}>
                  Add
                </button>
              </div>
            </form>
          </Popover>
        </div>
      </div>

      <div className="folders-shell">
        <div className={`folders-fade folders-fade-top${fadeTop ? ' is-visible' : ''}`} aria-hidden />
        <div className="folders-scroll" ref={scrollRef} onScroll={updateFades}>
          <DndContext
            sensors={folderSensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragStart={onFolderDragStart}
            onDragEnd={onFolderDragEnd}
            onDragCancel={() => setActiveFolderId(null)}
          >
            <SortableContext items={folders.map((f) => f.id)} strategy={verticalListSortingStrategy}>
              <div className="folders">
                {folders.map((folder) => (
                  <SortableFolder
                    key={folder.id}
                    folder={folder}
                    dragging={activeFolderId === folder.id}
                    onToggle={() => updateFolder(folder.id, { collapsed: !folder.collapsed })}
                    onRename={(name) => updateFolder(folder.id, { name })}
                    onDelete={() => onChangeFolders(folders.filter((f) => f.id !== folder.id))}
                    onAddLink={(title, url) =>
                      updateFolder(folder.id, {
                        links: [...folder.links, { id: createId('link'), title, url }],
                        collapsed: false,
                      })
                    }
                    onUpdateLink={(linkId, title, url) =>
                      updateFolder(folder.id, {
                        links: folder.links.map((l) =>
                          l.id === linkId ? { ...l, title, url } : l,
                        ),
                      })
                    }
                    onDeleteLink={(linkId) =>
                      updateFolder(folder.id, {
                        links: folder.links.filter((l) => l.id !== linkId),
                      })
                    }
                    onReorderLinks={(links) => updateFolder(folder.id, { links })}
                  />
                ))}
              </div>
            </SortableContext>
            <DragOverlay dropAnimation={null}>
              {activeFolder ? (
                <div className="folder folder-overlay">
                  <div className="folder-head">
                    <span className="folder-grip">
                      <GripIcon />
                    </span>
                    <span className="folder-name">{activeFolder.name}</span>
                  </div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
        <div
          className={`folders-fade folders-fade-bottom${fadeBottom ? ' is-visible' : ''}`}
          aria-hidden
        />
      </div>
    </section>
  )
}

function AppsRow({
  apps,
  editing,
  onChange,
}: {
  apps: AppShortcut[]
  editing: boolean
  onChange: (apps: AppShortcut[]) => void
}) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  )

  const activeApp = apps.find((a) => a.id === activeId) ?? null

  function onDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = apps.findIndex((a) => a.id === active.id)
    const newIndex = apps.findIndex((a) => a.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    onChange(arrayMove(apps, oldIndex, newIndex))
  }

  if (!editing) {
    return (
      <div className="apps-row">
        {apps.map((app) => (
          <a key={app.id} className="app-tile pressable" href={app.url}>
            <AppIcon app={app} />
            <span className="app-tile-label">{app.name}</span>
          </a>
        ))}
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToParentElement]}
      onDragStart={(e) => setActiveId(String(e.active.id))}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <SortableContext items={apps.map((a) => a.id)} strategy={rectSortingStrategy}>
        <div className="apps-row">
          {apps.map((app) => (
            <SortableAppTile
              key={app.id}
              app={app}
              onSave={(next) => onChange(apps.map((a) => (a.id === next.id ? next : a)))}
              onDelete={() => onChange(apps.filter((a) => a.id !== app.id))}
            />
          ))}
        </div>
      </SortableContext>
      <DragOverlay dropAnimation={null}>
        {activeApp ? (
          <div className="app-tile app-tile-overlay">
            <AppIcon app={activeApp} />
            <span className="app-tile-label">{activeApp.name}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

function SortableAppTile({
  app,
  onSave,
  onDelete,
}: {
  app: AppShortcut
  onSave: (app: AppShortcut) => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: app.id,
  })
  const [open, setOpen] = useState(false)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  }

  return (
    <div className="app-tile app-tile-edit" ref={setNodeRef} style={style}>
      <button type="button" className="app-tile-drag" aria-label="Reorder app" {...attributes} {...listeners}>
        <GripIcon />
      </button>
      <Popover
        open={open}
        onOpenChange={setOpen}
        placement="bottom"
        title="Edit app"
        trigger={
          <button type="button" className="app-tile-edit-btn" aria-label={`Edit ${app.name}`}>
            <EditIcon />
          </button>
        }
      >
        <AppEditForm
          mode="edit"
          app={app}
          onSave={(next) => {
            onSave(next)
            setOpen(false)
          }}
          onCancel={() => setOpen(false)}
          onDelete={() => {
            onDelete()
            setOpen(false)
          }}
        />
      </Popover>
      <AppIcon app={app} />
      <span className="app-tile-label">{app.name}</span>
    </div>
  )
}

function AppEditForm({
  mode,
  app,
  onSave,
  onCancel,
  onDelete,
}: {
  mode: 'create' | 'edit'
  app?: AppShortcut
  onSave: (app: AppShortcut) => void
  onCancel: () => void
  onDelete?: () => void
}) {
  const formId = app?.id ?? 'new'
  const [name, setName] = useState(app?.name ?? '')
  const [url, setUrl] = useState(app?.url ?? 'https://')
  const [iconDataUrl, setIconDataUrl] = useState(app?.iconDataUrl)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const previewApp: AppShortcut = {
    id: formId,
    name: name || 'App',
    url: url || 'https://',
    iconDataUrl,
    iconKey: app?.iconKey ?? 'link',
  }

  return (
    <form
      className="popover-form"
      onSubmit={(e) => {
        e.preventDefault()
        if (!name.trim() || !url.trim()) return
        onSave({
          id: app?.id ?? createId('app'),
          name: name.trim(),
          url: url.trim(),
          iconDataUrl,
          iconKey: app?.iconKey ?? 'link',
        })
      }}
    >
      <div className="field">
        <label htmlFor={`app-name-${formId}`}>Name</label>
        <input
          id={`app-name-${formId}`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Linear"
          autoFocus
        />
      </div>
      <div className="field">
        <label htmlFor={`app-url-${formId}`}>URL</label>
        <input
          id={`app-url-${formId}`}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://linear.app"
        />
      </div>
      <div className="field">
        <label>Icon</label>
        <div className="icon-upload">
          <div className="icon-upload-preview">
            <AppIcon app={previewApp} size={18} />
          </div>
          <div className="icon-upload-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => fileRef.current?.click()}
            >
              Upload
            </button>
            {iconDataUrl ? (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setIconDataUrl(undefined)}
              >
                Reset
              </button>
            ) : null}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (!file) return
              void fileToIconDataUrl(file)
                .then((dataUrl) => {
                  setIconDataUrl(dataUrl)
                  setError(null)
                })
                .catch((err: unknown) => {
                  setError(err instanceof Error ? err.message : 'Could not read image')
                })
            }}
          />
        </div>
        {error ? <p className="field-hint" style={{ color: 'var(--danger)' }}>{error}</p> : null}
        <p className="field-hint">Stored locally in this browser.</p>
      </div>
      <div className="popover-actions">
        {mode === 'edit' && onDelete ? (
          <button type="button" className="btn-secondary btn-danger" onClick={onDelete}>
            <TrashIcon />
            Delete
          </button>
        ) : null}
        <div style={{ flex: 1 }} />
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={!name.trim() || !url.trim()}>
          {mode === 'create' ? 'Add' : 'Save'}
        </button>
      </div>
    </form>
  )
}

function SortableFolder({
  folder,
  dragging,
  onToggle,
  onRename,
  onDelete,
  onAddLink,
  onUpdateLink,
  onDeleteLink,
  onReorderLinks,
}: {
  folder: ShortcutFolder
  dragging: boolean
  onToggle: () => void
  onRename: (name: string) => void
  onDelete: () => void
  onAddLink: (title: string, url: string) => void
  onUpdateLink: (linkId: string, title: string, url: string) => void
  onDeleteLink: (linkId: string) => void
  onReorderLinks: (links: FolderLink[]) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: folder.id,
  })
  const [editOpen, setEditOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [name, setName] = useState(folder.name)

  const linkSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging || dragging ? 0.35 : 1,
  }

  function onLinkDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = folder.links.findIndex((l) => l.id === active.id)
    const newIndex = folder.links.findIndex((l) => l.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    onReorderLinks(arrayMove(folder.links, oldIndex, newIndex))
  }

  return (
    <div className="folder" ref={setNodeRef} style={style}>
      <div className="folder-head">
        <button
          type="button"
          className="folder-grip"
          aria-label="Drag folder"
          {...attributes}
          {...listeners}
        >
          <GripIcon />
        </button>

        <button type="button" className="folder-toggle" onClick={onToggle}>
          <span className="folder-content-start">
            <span className="folder-name">{folder.name}</span>
            <span className={`folder-chevron${folder.collapsed ? '' : ' open'}`}>
              <ChevronIcon />
            </span>
          </span>
        </button>

        <div className="folder-head-actions">
          <Popover
            open={addOpen}
            onOpenChange={setAddOpen}
            placement="bottom-end"
            title="Add link"
            trigger={
              <button type="button" className="mini-btn" title="Add link" aria-label="Add link">
                <PlusIcon />
              </button>
            }
          >
            <LinkForm
              onCancel={() => setAddOpen(false)}
              onSave={(title, url) => {
                onAddLink(title, url)
                setAddOpen(false)
              }}
            />
          </Popover>

          <Popover
            open={editOpen}
            onOpenChange={(next) => {
              setEditOpen(next)
              if (next) setName(folder.name)
            }}
            placement="bottom-end"
            title="Edit folder"
            trigger={
              <button type="button" className="mini-btn" title="Edit folder" aria-label="Edit folder">
                <EditIcon />
              </button>
            }
          >
            <form
              className="popover-form"
              onSubmit={(e) => {
                e.preventDefault()
                if (!name.trim()) return
                onRename(name.trim())
                setEditOpen(false)
              }}
            >
              <div className="field">
                <label htmlFor={`folder-name-${folder.id}`}>Name</label>
                <input
                  id={`folder-name-${folder.id}`}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="popover-actions">
                <button
                  type="button"
                  className="btn-secondary btn-danger"
                  onClick={() => {
                    onDelete()
                    setEditOpen(false)
                  }}
                >
                  <TrashIcon />
                  Delete
                </button>
                <div style={{ flex: 1 }} />
                <button type="button" className="btn-secondary" onClick={() => setEditOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={!name.trim()}>
                  Save
                </button>
              </div>
            </form>
          </Popover>
        </div>
      </div>

      {!folder.collapsed ? (
        <div className="folder-links">
          {folder.links.length === 0 ? (
            <div className="folder-empty">No links yet</div>
          ) : (
            <DndContext
              sensors={linkSensors}
              collisionDetection={closestCenter}
              modifiers={[restrictToVerticalAxis, restrictToParentElement]}
              onDragEnd={onLinkDragEnd}
            >
              <SortableContext
                items={folder.links.map((l) => l.id)}
                strategy={verticalListSortingStrategy}
              >
                {folder.links.map((link) => (
                  <SortableLink
                    key={link.id}
                    link={link}
                    onSave={(title, url) => onUpdateLink(link.id, title, url)}
                    onDelete={() => onDeleteLink(link.id)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>
      ) : null}
    </div>
  )
}

function FolderFavicon({ url }: { url: string }) {
  const sources = useMemo(() => faviconSourcesForUrl(url), [url])
  const [index, setIndex] = useState(0)

  if (sources.length === 0 || index >= sources.length) {
    return <span className="folder-favicon folder-favicon-fallback" aria-hidden />
  }

  return (
    <img
      className="folder-favicon"
      src={sources[index]}
      alt=""
      width={16}
      height={16}
      draggable={false}
      onError={() => setIndex((i) => i + 1)}
    />
  )
}

function SortableLink({
  link,
  onSave,
  onDelete,
}: {
  link: FolderLink
  onSave: (title: string, url: string) => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: link.id,
  })
  const [open, setOpen] = useState(false)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  }

  return (
    <div className="folder-link" ref={setNodeRef} style={style}>
      <button
        type="button"
        className="folder-grip"
        aria-label="Drag link"
        {...attributes}
        {...listeners}
      >
        <GripIcon />
      </button>
      <a className="folder-link-main" href={link.url}>
        <span className="folder-content-start">
          <FolderFavicon url={link.url} />
          <span className="folder-link-title">{link.title}</span>
        </span>
      </a>
      <div className="folder-link-actions">
        <Popover
          open={open}
          onOpenChange={setOpen}
          placement="bottom-end"
          title="Edit link"
          trigger={
            <button type="button" className="mini-btn" title="Edit" aria-label="Edit link">
              <EditIcon />
            </button>
          }
        >
          <LinkForm
            link={link}
            onCancel={() => setOpen(false)}
            onSave={(title, url) => {
              onSave(title, url)
              setOpen(false)
            }}
            onDelete={() => {
              onDelete()
              setOpen(false)
            }}
          />
        </Popover>
      </div>
    </div>
  )
}

function LinkForm({
  link,
  onSave,
  onCancel,
  onDelete,
}: {
  link?: FolderLink
  onSave: (title: string, url: string) => void
  onCancel: () => void
  onDelete?: () => void
}) {
  const [title, setTitle] = useState(link?.title ?? '')
  const [url, setUrl] = useState(link?.url ?? 'https://')

  return (
    <form
      className="popover-form"
      onSubmit={(e) => {
        e.preventDefault()
        if (!title.trim() || !url.trim()) return
        onSave(title.trim(), url.trim())
      }}
    >
      <div className="field">
        <label>Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Design system"
          autoFocus
        />
      </div>
      <div className="field">
        <label>URL</label>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.figma.com/file/…"
        />
      </div>
      <div className="popover-actions">
        {onDelete ? (
          <button type="button" className="btn-secondary btn-danger" onClick={onDelete}>
            <TrashIcon />
            Delete
          </button>
        ) : null}
        <div style={{ flex: 1 }} />
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={!title.trim() || !url.trim()}>
          Save
        </button>
      </div>
    </form>
  )
}
