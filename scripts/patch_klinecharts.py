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

    with open(filename, 'w', encoding='utf-8') as f:
        f.write(code)

print("Patch script complete.")
