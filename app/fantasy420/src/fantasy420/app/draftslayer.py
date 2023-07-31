# pipenv run python3 src/fantasy420/app/draftslayer.py ~/Downloads/Draft_Slayer.xlsm
import json
import sys

import openpyxl


def main():
    path = sys.argv[1]
    sheet_obj = get_sheet_obj(path)
    rval = get_rval(sheet_obj)
    print(json.dumps(rval))


def get_sheet_obj(path):
    wb_obj = openpyxl.load_workbook(path)
    sheet_obj = wb_obj["ADP"]
    return sheet_obj


def get_rval(sheet_obj):
    indices = None
    rval = {}
    for row in sheet_obj:
        if indices is None:
            if [None for i in row if i.value is not None]:
                indices = [None, None]
                for index, cell in enumerate(row):
                    if str(cell.value).strip() == 'Position Rank':
                        indices = None
                        continue
                    if str(cell.value).strip() == 'Player Name':
                        indices[0] = index
                    if str(cell.value).strip() == 'ADP':
                        indices[1] = index
            continue
        parts = [row[index].value for index in indices]
        if parts[0] == '':
            break
        rval[parts[0]] = float(parts[1])
    return rval


if __name__ == "__main__":
    main()