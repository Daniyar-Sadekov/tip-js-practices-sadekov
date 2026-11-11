import copy, os, sys
import docx
from docx.shared import Cm
from docx.enum.text import WD_COLOR_INDEX
from docx.oxml.ns import qn
sys.path.insert(0, os.path.dirname(__file__))
from listings import L1, L2, L3, L4, L5, SHOTS, EXPLAIN4

BASE = os.path.dirname(__file__)
SHOTS_DIR = sys.argv[1] if len(sys.argv) > 1 else os.path.join(BASE, "shots")
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(BASE, "КР2_ЭФБО-06-25_СадековДЖ.docx")
DATE = "07.11.2026"

doc = docx.Document(os.path.join(BASE, "kr1.docx"))
task = docx.Document(os.path.join(BASE, "kr2task.docx"))
P = doc.paragraphs


def set_text(par, text):
    runs = par.runs
    runs[0].text = text
    for r in runs[1:]:
        r._r.getparent().remove(r._r)


# ── Титульный лист ─────────────────────────────────────
assert "Основы языка JavaScript" in P[10].text and P[13].text.strip() == "Контрольная работа № 1"
set_text(P[10], "на тему «Формы, хранение данных и API»")
set_text(P[13], "Контрольная работа № 2")

# ── Тело: заменить задание КР1 на задание КР2 ──────────
body = doc.element.body
for p in P[34:]:
    body.remove(p._p)
sect = body.find(qn("w:sectPr"))
skip = {24, 31, 37}  # пустые «Поле отчёта» в шаблоне
for i, p in enumerate(task.paragraphs):
    if i in skip:
        continue
    sect.addprevious(copy.deepcopy(p._p))

P = doc.paragraphs
# эталонный формат прогона из КР1 (TNR 14, без курсива)
RUN_RPR = """<w:rPr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
<w:i w:val="0"/><w:color w:val="000000" w:themeColor="text1"/><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr>"""
from docx.oxml import parse_xml


def clear_runs(par):
    for child in list(par._p):
        if child.tag != qn("w:pPr"):
            par._p.remove(child)
    ppr = par._p.find(qn("w:pPr"))
    jc = ppr.find(qn("w:jc"))
    if jc is not None:
        ppr.remove(jc)  # код не растягиваем по ширине


def new_run(par, text="", highlight=False):
    run = par.add_run()
    run._r.insert(0, parse_xml(RUN_RPR))
    if highlight:
        run.font.highlight_color = WD_COLOR_INDEX.YELLOW
    if text:
        run.text = text
    return run


def write_lines(par, label, text):
    clear_runs(par)
    run = new_run(par, label)
    for line in text.split("\n"):
        run.add_break()
        t = run._r.makeelement(qn("w:t"), {})
        t.text = line
        t.set("{http://www.w3.org/XML/1998/namespace}space", "preserve")
        run._r.append(t)


def write_shot(par, shot):
    name, label, caption = shot
    clear_runs(par)
    run = new_run(par, label)
    run.add_break()
    path = os.path.join(SHOTS_DIR, name)
    if os.path.exists(path):
        pic = new_run(par)
        pic.add_picture(path, width=Cm(16))
        missing = False
    else:
        new_run(par, f"[Сюда вставить скриншот {name}]", highlight=True)
        missing = True
    tail = new_run(par)
    tail.add_break()
    tail.add_break()
    tail.add_text(caption)
    return missing


def find(prefix):
    for p in doc.paragraphs:
        if p.text.startswith(prefix):
            return p
    raise KeyError(prefix)


for prefix, value in [("ФИО:", "ФИО: Садеков Данияр Жигангисович"),
                      ("Группа:", "Группа: ЭФБО-06-25"),
                      ("Дата:", f"Дата: {DATE}")]:
    p = [x for x in doc.paragraphs if x.text.startswith(prefix)][-1]
    set_text(p, value)

write_lines(find("Листинг 1."), "Листинг 1. Проверка названия в validateTaskDraft (ПР4) и два вызова:", L1)
write_lines(find("Листинг 2."), "Листинг 2. Сохранение и восстановление JSON (ПР4) и места вызова:", L2)
write_lines(find("Листинг 3."), "Листинг 3. getTasks, настройка клиента и проверочный вызов (ПР5):", L3)
write_lines(find("Листинг 4."), "Листинг 4. Проверка HTTP-статуса и вызов getTaskById(999) с перехватом ошибки (ПР5):", L4)
write_lines(find("Листинг 5."), "Листинг 5. Изменение статуса через API и последующая загрузка (ПР6):", L5)

missing = []
for n, shot in enumerate(SHOTS, start=1):
    par = find(f"Скриншот {n}.")
    if n == 4:
        explain = copy.deepcopy(par._p)
        par._p.addnext(explain)
    if write_shot(par, shot):
        missing.append(shot[0])
    if n == 4:
        ep = docx.text.paragraph.Paragraph(explain, par._parent)
        clear_runs(ep)
        new_run(ep, EXPLAIN4)

for section in doc.sections:
    for p in section.footer.paragraphs:
        if p.runs and p.runs[0].text == "КР № " and p.runs[1].text.startswith("1"):
            p.runs[1].text = "2" + p.runs[1].text[1:]

doc.save(OUT)
print("saved", OUT, "missing:", missing)
