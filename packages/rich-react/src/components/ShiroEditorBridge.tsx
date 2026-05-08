import type { ShiroEditorProps } from '@haklex/rich-kit-shiro'
import type { LexicalEditor } from 'lexical'
import type { ReactNode } from 'react'
import type { SaveExcalidrawSnapshot } from '../types'
import type { EnrichmentFetcher } from './EnrichmentLinkCardContext'

import { DialogStackProvider } from '@haklex/rich-editor-ui'
import {
  NestedDocDialogEditorProvider,
  nestedDocEditNodes,
} from '@haklex/rich-ext-nested-doc'
import { ExcalidrawConfigProvider, ShiroEditor } from '@haklex/rich-kit-shiro'
import { ToolbarPlugin } from '@haklex/rich-plugin-toolbar'

import { EnrichmentFetcherProvider } from './EnrichmentLinkCardContext'
import { NestedDocDialogEditor } from './NestedDocDialogEditor'

import './setup-enrichment-linkcard'

export interface ShiroEditorBridgeProps {
  editorProps: Omit<ShiroEditorProps, 'onChange' | 'onSubmit' | 'onEditorReady'>
  saveExcalidrawSnapshot: SaveExcalidrawSnapshot
  apiUrl: string
  onChange?: ShiroEditorProps['onChange']
  onSubmit?: ShiroEditorProps['onSubmit']
  onEditorReady?: (editor: LexicalEditor | null) => void
  fetchEnrichment?: EnrichmentFetcher | null
  children?: ReactNode
}

export function ShiroEditorBridge({
  editorProps,
  saveExcalidrawSnapshot,
  apiUrl,
  onChange,
  onSubmit,
  onEditorReady,
  fetchEnrichment,
  children,
}: ShiroEditorBridgeProps) {
  return (
    <EnrichmentFetcherProvider value={fetchEnrichment ?? null}>
      <NestedDocDialogEditorProvider value={NestedDocDialogEditor}>
        <DialogStackProvider>
          <ExcalidrawConfigProvider
            saveSnapshot={saveExcalidrawSnapshot}
            apiUrl={apiUrl}
          >
            <ShiroEditor
              {...editorProps}
              extraNodes={[
                ...(editorProps.extraNodes || []),
                ...nestedDocEditNodes,
              ]}
              header={<ToolbarPlugin />}
              onChange={onChange}
              onSubmit={onSubmit}
              onEditorReady={onEditorReady}
            >
              {children}
            </ShiroEditor>
          </ExcalidrawConfigProvider>
        </DialogStackProvider>
      </NestedDocDialogEditorProvider>
    </EnrichmentFetcherProvider>
  )
}
