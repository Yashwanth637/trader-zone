import os

for filename in ['node_modules/@simahfud/klinecharts-pro/dist/klinecharts-pro.js', 'node_modules/@simahfud/klinecharts-pro/dist/klinecharts-pro.umd.js']:
    if not os.path.exists(filename):
        continue
    with open(filename, 'r', encoding='utf-8') as f:
        code = f.read()

    # 1. Timezone in RA(t)
    old_ra = '{ key: "Asia/Ashkhabad", text: $("ashkhabad", t) },'
    new_ra = '{ key: "Asia/Ashkhabad", text: $("ashkhabad", t) },\n    { key: "Asia/Kolkata", text: "(UTC+5:30) Kolkata" },'
    if old_ra in code and 'key: "Asia/Kolkata"' not in code:
        code = code.replace(old_ra, new_ra)
        print(f"[{filename}] Patched RA timezone list!")

    # 2. Timezone in ys
    old_ys = 'case "Asia/Ashkhabad":\n      return $("ashkhabad", e);'
    new_ys = 'case "Asia/Ashkhabad":\n      return $("ashkhabad", e);\n    case "Asia/Kolkata":\n      return "(UTC+5:30) Kolkata";'
    if old_ys in code and 'case "Asia/Kolkata":' not in code:
        code = code.replace(old_ys, new_ys)
        print(f"[{filename}] Patched ys timezone formatter!")

    # 3. Pine compile ready()
    old_compile = 'this.injectSyminfo(i);\n      const r = await i.run(e)'
    new_compile = 'this.injectSyminfo(i);\n      await i.ready();\n      const r = await i.run(e)'
    if old_compile in code:
        code = code.replace(old_compile, new_compile)
        print(f"[{filename}] Patched Pine compile ready()!")

    # 4. Pine calc ready()
    old_calc = 'basecurrency: "USD"\n        };\n        const m = await d.run(n)'
    new_calc = 'basecurrency: "USD"\n        };\n        await d.ready();\n        const m = await d.run(n)'
    if old_calc in code:
        code = code.replace(old_calc, new_calc)
        print(f"[{filename}] Patched Pine calc ready()!")

    # 5. Bar Replay Drag Lock - stepForward calls this._applyData(true)
    old_step_js = 'this._playbackIndex < this._fullData.length - 1 && (this._playbackIndex++, this._applyData(),'
    new_step_js = 'this._playbackIndex < this._fullData.length - 1 && (this._playbackIndex++, this._applyData(true),'
    if old_step_js in code:
        code = code.replace(old_step_js, new_step_js)
        print(f"[{filename}] Patched stepForward() to pass true!")

    old_step_umd = 'this._playbackIndex<this._fullData.length-1&&(this._playbackIndex++,this._applyData(),'
    new_step_umd = 'this._playbackIndex<this._fullData.length-1&&(this._playbackIndex++,this._applyData(true),'
    if old_step_umd in code:
        code = code.replace(old_step_umd, new_step_umd)
        print(f"[{filename}] Patched stepForward() UMD to pass true!")

    # 6. Bar Replay Drag Lock - _applyData preserves user pan / drag position
    old_apply_js = '''  _applyData() {
    const e = this._fullData.slice(0, this._playbackIndex + 1);
    this._chart.applyNewData(e);
  }'''
    new_apply_js = '''  _applyData(isForward = false) {
    if (!this._chart) return;
    const currentBar = this._fullData[this._playbackIndex];
    if (isForward && currentBar) {
      this._chart.updateData(currentBar);
      return;
    }
    let prevDiff = null;
    try {
      if (this._chart._chartStore && this._chart._chartStore.getTimeScaleStore) {
        prevDiff = this._chart._chartStore.getTimeScaleStore().getLastBarRightSideDiffBarCount();
      }
    } catch (_) {}
    const e = this._fullData.slice(0, this._playbackIndex + 1);
    this._chart.applyNewData(e);
    if (prevDiff !== null) {
      try {
        const tsStore = this._chart._chartStore.getTimeScaleStore();
        tsStore.setLastBarRightSideDiffBarCount(prevDiff);
        if (this._chart.adjustPaneViewport) {
          this._chart.adjustPaneViewport(false, true, true, true);
        } else if (this._chart.getChart) {
          this._chart.getChart().adjustPaneViewport(false, true, true, true);
        }
      } catch (_) {}
    }
  }'''
    if old_apply_js in code:
        code = code.replace(old_apply_js, new_apply_js)
        print(f"[{filename}] Patched _applyData() JS!")

    old_apply_umd = '_applyData(){const e=this._fullData.slice(0,this._playbackIndex+1);this._chart.applyNewData(e)}'
    new_apply_umd = '_applyData(isForward){if(!this._chart)return;const currentBar=this._fullData[this._playbackIndex];if(isForward&&currentBar){this._chart.updateData(currentBar);return;}let prevDiff=null;try{if(this._chart._chartStore&&this._chart._chartStore.getTimeScaleStore){prevDiff=this._chart._chartStore.getTimeScaleStore().getLastBarRightSideDiffBarCount()}}catch(_){}const e=this._fullData.slice(0,this._playbackIndex+1);this._chart.applyNewData(e);if(prevDiff!==null){try{const ts=this._chart._chartStore.getTimeScaleStore();ts.setLastBarRightSideDiffBarCount(prevDiff);if(this._chart.adjustPaneViewport){this._chart.adjustPaneViewport(!1,!0,!0,!0)}else if(this._chart.getChart){this._chart.getChart().adjustPaneViewport(!1,!0,!0,!0)}}catch(_){}}}'
    if old_apply_umd in code:
        code = code.replace(old_apply_umd, new_apply_umd)
        print(f"[{filename}] Patched _applyData() UMD!")

    # 7. Toolbar onSettingClick callback passthrough
    old_setting_js = '''    onSettingClick: () => {
      W((E) => !E);
    },'''
    new_setting_js = '''    onSettingClick: () => {
      t.onSettingClick ? t.onSettingClick() : W((E) => !E);
    },'''
    if old_setting_js in code:
        code = code.replace(old_setting_js, new_setting_js)
        print(f"[{filename}] Patched onSettingClick JS!")

    old_setting_umd = 'onSettingClick:()=>{W(k=>!k)}'
    new_setting_umd = 'onSettingClick:()=>{t.onSettingClick?t.onSettingClick():W(k=>!k)}'
    if old_setting_umd in code:
        code = code.replace(old_setting_umd, new_setting_umd)
        print(f"[{filename}] Patched onSettingClick UMD!")

    # 8. KLineChartPro options passthrough for onSettingClick
    old_xu_js = '''      get onLayoutClick() {
        return e.onLayoutClick;
      }'''
    new_xu_js = '''      get onLayoutClick() {
        return e.onLayoutClick;
      },
      get onSettingClick() {
        return e.onSettingClick;
      }'''
    if old_xu_js in code and 'get onSettingClick()' not in code:
        code = code.replace(old_xu_js, new_xu_js)
        print(f"[{filename}] Patched XU options passthrough with onSettingClick JS!")

    old_xu_umd = 'get onLayoutClick(){return e.onLayoutClick}})'
    new_xu_umd = 'get onLayoutClick(){return e.onLayoutClick},get onSettingClick(){return e.onSettingClick}})'
    if old_xu_umd in code and 'get onSettingClick()' not in code:
        code = code.replace(old_xu_umd, new_xu_umd)
        print(f"[{filename}] Patched XU options passthrough with onSettingClick UMD!")

    with open(filename, 'w', encoding='utf-8') as f:
        f.write(code)

# 9. Type definitions patch for ChartProOptions.onSettingClick
dts_path = 'node_modules/@simahfud/klinecharts-pro/dist/index.d.ts'
if os.path.exists(dts_path):
    with open(dts_path, 'r', encoding='utf-8') as f:
        dts = f.read()
    if 'onSettingClick?: () => void;' not in dts and 'onLayoutClick?: () => void;' in dts:
        dts = dts.replace('onLayoutClick?: () => void;', 'onLayoutClick?: () => void;\n\tonSettingClick?: () => void;')
        with open(dts_path, 'w', encoding='utf-8') as f:
            f.write(dts)
        print(f"[{dts_path}] Patched ChartProOptions with onSettingClick!")

print("Patch script complete.")
