import React, { useState, useEffect } from 'react';
import {
  Code2,
  Play,
  Save,
  Trash2,
  FolderOpen,
  Plus,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  X,
  FileCode,
  Sparkles
} from 'lucide-react';
import { Button } from '../ui/Button';
import {
  SavedPineScript,
  BUILT_IN_PINE_TEMPLATES,
  getUserSavedPineScripts,
  saveUserPineScripts
} from '../../lib/pineScriptEngine';

interface PineEditorPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  userId?: string;
  onApplyScriptToChart: (scriptCode: string) => { success: boolean; error?: string };
  onRemoveActiveIndicator: () => void;
  hasActiveIndicator: boolean;
  activeIndicatorName?: string;
}

export const PineEditorPanel: React.FC<PineEditorPanelProps> = ({
  isOpen,
  onToggle,
  userId,
  onApplyScriptToChart,
  onRemoveActiveIndicator,
  hasActiveIndicator,
  activeIndicatorName
}) => {
  const [activeTab, setActiveTab] = useState<'editor' | 'library'>('editor');
  const [scriptsList, setScriptsList] = useState<SavedPineScript[]>(() =>
    getUserSavedPineScripts(userId)
  );

  // Active working script
  const [currentScriptId, setCurrentScriptId] = useState<string>(
    BUILT_IN_PINE_TEMPLATES[0].id
  );
  const [scriptTitle, setScriptTitle] = useState<string>(
    BUILT_IN_PINE_TEMPLATES[0].name
  );
  const [scriptCode, setScriptCode] = useState<string>(
    BUILT_IN_PINE_TEMPLATES[0].code
  );

  // Compiler / runtime feedback
  const [compilerStatus, setCompilerStatus] = useState<{
    type: 'idle' | 'success' | 'error';
    message?: string;
  }>({ type: 'idle' });

  // Sync saved scripts when userId changes
  useEffect(() => {
    setScriptsList(getUserSavedPineScripts(userId));
  }, [userId]);

  // Handle template selection
  const handleSelectTemplate = (template: SavedPineScript) => {
    setCurrentScriptId(template.id);
    setScriptTitle(template.name);
    setScriptCode(template.code);
    setCompilerStatus({ type: 'idle' });
  };

  // Handle Save
  const handleSaveScript = () => {
    const isExisting = scriptsList.find(s => s.id === currentScriptId && !s.isBuiltIn);
    let updated: SavedPineScript[];

    if (isExisting) {
      updated = scriptsList.map(s =>
        s.id === currentScriptId
          ? { ...s, name: scriptTitle, code: scriptCode, updatedAt: new Date().toISOString() }
          : s
      );
    } else {
      const newId = `user_script_${Date.now()}`;
      const newScript: SavedPineScript = {
        id: newId,
        name: scriptTitle || 'Untitled Custom Indicator',
        code: scriptCode,
        overlay: true,
        isBuiltIn: false,
        updatedAt: new Date().toISOString()
      };
      setCurrentScriptId(newId);
      updated = [newScript, ...scriptsList];
    }

    setScriptsList(updated);
    saveUserPineScripts(updated, userId);
    setCompilerStatus({ type: 'success', message: 'Script saved to your account library!' });
  };

  // Handle Add to Chart (Run)
  const handleRunScript = () => {
    const result = onApplyScriptToChart(scriptCode);
    if (result.success) {
      setCompilerStatus({
        type: 'success',
        message: 'Indicator compiled & active on chart!'
      });
    } else {
      setCompilerStatus({
        type: 'error',
        message: result.error || 'Execution failed'
      });
    }
  };

  // Handle New Script
  const handleNewScript = () => {
    const blankId = `script_${Date.now()}`;
    setCurrentScriptId(blankId);
    setScriptTitle('New Custom Indicator');
    setScriptCode(`//@version=5
indicator("My Custom Indicator", overlay=true)

// Calculations
ema20 = ta.ema(close, 20)
sma50 = ta.sma(close, 50)

// Plot lines
plot(ema20, "Fast EMA 20", color=color.cyan, linewidth=2)
plot(sma50, "Base SMA 50", color=color.orange, linewidth=2)`);
    setCompilerStatus({ type: 'idle' });
    setActiveTab('editor');
  };

  // Handle Delete
  const handleDeleteScript = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = scriptsList.filter(s => s.id !== id);
    setScriptsList(updated);
    saveUserPineScripts(updated, userId);
    if (currentScriptId === id) {
      handleSelectTemplate(BUILT_IN_PINE_TEMPLATES[0]);
    }
  };

  // Calculate line numbers
  const lines = scriptCode.split('\n');

  return (
    <div
      className={`border-t border-border/60 bg-surface-card transition-all duration-300 flex flex-col ${
        isOpen ? 'h-[340px] shrink-0' : 'h-10 shrink-0'
      }`}
    >
      {/* Top Header Dock Bar */}
      <div className="h-10 px-3 bg-surface border-b border-border/40 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggle}
            className="flex items-center gap-2 text-xs font-black text-foreground hover:text-primary transition-colors"
          >
            <Code2 className="w-4 h-4 text-primary" />
            <span>Pine Editor & Custom Indicators</span>
            {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>

          {hasActiveIndicator && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Active: {activeIndicatorName || 'Custom'}</span>
              <button
                type="button"
                onClick={onRemoveActiveIndicator}
                className="hover:text-rose-400 ml-1 transition-colors"
                title="Remove Indicator from Chart"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {isOpen && (
          <div className="flex items-center gap-2">
            {/* Tabs */}
            <div className="flex items-center bg-surface-card p-0.5 rounded-lg border border-border/40">
              <button
                type="button"
                onClick={() => setActiveTab('editor')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                  activeTab === 'editor'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-muted hover:text-foreground'
                }`}
              >
                Editor
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('library')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all flex items-center gap-1 ${
                  activeTab === 'library'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-muted hover:text-foreground'
                }`}
              >
                <FolderOpen className="w-3 h-3" />
                <span>My Scripts ({scriptsList.length})</span>
              </button>
            </div>

            <Button
              size="sm"
              variant="secondary"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={handleNewScript}
            >
              New
            </Button>

            <Button
              size="sm"
              variant="secondary"
              icon={<Save className="w-3.5 h-3.5" />}
              onClick={handleSaveScript}
            >
              Save
            </Button>

            <Button
              size="sm"
              variant="primary"
              icon={<Play className="w-3.5 h-3.5" />}
              onClick={handleRunScript}
            >
              Add to Chart
            </Button>
          </div>
        )}
      </div>

      {/* Editor Body */}
      {isOpen && (
        <div className="flex-1 flex flex-col min-h-0 bg-background/50">
          {activeTab === 'editor' ? (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Script Title & Quick Template Bar */}
              <div className="px-3 py-1.5 bg-surface/40 border-b border-border/40 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-[11px] text-muted font-bold">Script Name:</span>
                  <input
                    type="text"
                    value={scriptTitle}
                    onChange={e => setScriptTitle(e.target.value)}
                    className="px-2 py-1 rounded-md border border-border/40 bg-surface text-xs font-bold text-foreground focus:outline-none focus:border-primary flex-1 max-w-sm"
                    placeholder="Indicator Name"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted hidden sm:inline">Templates:</span>
                  <select
                    value={currentScriptId}
                    onChange={e => {
                      const found = scriptsList.find(s => s.id === e.target.value);
                      if (found) handleSelectTemplate(found);
                    }}
                    className="px-2 py-1 rounded-md border border-border/40 bg-surface text-[11px] font-semibold text-foreground focus:outline-none cursor-pointer"
                  >
                    {scriptsList.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.isBuiltIn ? '(Built-in)' : '(Saved)'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Code Editor Container */}
              <div className="flex-1 flex min-h-0 relative overflow-hidden font-mono text-xs">
                {/* Line Numbers */}
                <div className="w-10 bg-surface/80 border-r border-border/40 select-none text-right pr-2 pt-2 text-[11px] text-muted/60 leading-5">
                  {lines.map((_, i) => (
                    <div key={i}>{i + 1}</div>
                  ))}
                </div>

                {/* Code Textarea */}
                <textarea
                  value={scriptCode}
                  onChange={e => setScriptCode(e.target.value)}
                  spellCheck={false}
                  className="flex-1 p-2 bg-transparent text-foreground font-mono text-xs leading-5 resize-none focus:outline-none overflow-y-auto selection:bg-primary/30"
                  placeholder="Paste or write Pine Script indicator code here..."
                />
              </div>

              {/* Compiler Status Bar */}
              {compilerStatus.type !== 'idle' && (
                <div
                  className={`px-3 py-1.5 text-xs flex items-center justify-between border-t ${
                    compilerStatus.type === 'error'
                      ? 'bg-rose-500/15 border-rose-500/30 text-rose-400 font-semibold'
                      : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 font-semibold'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {compilerStatus.type === 'error' ? (
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                    )}
                    <span>{compilerStatus.message}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCompilerStatus({ type: 'idle' })}
                    className="text-xs hover:underline"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Scripts Library Tab */
            <div className="flex-1 p-4 overflow-y-auto">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-black text-foreground uppercase tracking-wider">
                  Saved Indicators & Pine Scripts
                </h3>
                <span className="text-[11px] text-muted">
                  Auto-saved in your user account storage
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {scriptsList.map(item => (
                  <div
                    key={item.id}
                    onClick={() => {
                      handleSelectTemplate(item);
                      setActiveTab('editor');
                    }}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      currentScriptId === item.id
                        ? 'border-primary bg-primary/10 shadow-sm'
                        : 'border-border/60 hover:border-primary/40 bg-surface'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <FileCode className="w-3.5 h-3.5 text-primary" />
                          <span className="text-xs font-bold text-foreground">{item.name}</span>
                        </div>
                        {item.isBuiltIn && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                            Preset
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-muted line-clamp-2 font-mono">
                        {item.code.split('\n')[1] || item.code.substring(0, 60)}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-border/40">
                      <span className="text-[9px] text-muted">
                        {new Date(item.updatedAt).toLocaleDateString()}
                      </span>
                      <div className="flex items-center gap-1">
                        {!item.isBuiltIn && (
                          <button
                            type="button"
                            onClick={e => handleDeleteScript(item.id, e)}
                            className="p-1 rounded text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Delete Script"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <span className="text-[10px] text-primary font-bold hover:underline">
                          Open in Editor &rarr;
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
