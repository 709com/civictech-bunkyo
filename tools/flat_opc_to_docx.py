"""Word が書き出した Flat OPC（1つの XML にまとめた文書）を、普通の .docx（zip）に組み立てる。

使い方: py -3 tools/flat_opc_to_docx.py <入力 .flat.xml> <出力 .docx>
中身は1文字も変えない（各部品の XML をそのまま zip に入れるだけ）。
"""
import base64
import sys
import zipfile

from lxml import etree

PKG = "http://schemas.microsoft.com/office/2006/xmlPackage"
CT = "http://schemas.openxmlformats.org/package/2006/content-types"


def convert(src, dst):
    tree = etree.parse(src)
    parts = tree.getroot().findall(f"{{{PKG}}}part")
    overrides = []
    with zipfile.ZipFile(dst, "w", zipfile.ZIP_DEFLATED) as z:
        for p in parts:
            name = p.get(f"{{{PKG}}}name")
            ctype = p.get(f"{{{PKG}}}contentType")
            xml = p.find(f"{{{PKG}}}xmlData")
            binary = p.find(f"{{{PKG}}}binaryData")
            if xml is not None:
                child = xml[0]
                data = etree.tostring(child, xml_declaration=True,
                                      encoding="UTF-8", standalone=True)
            elif binary is not None:
                data = base64.b64decode("".join(binary.text.split()))
            else:
                raise ValueError(f"中身のない部品: {name}")
            z.writestr(name.lstrip("/"), data)
            overrides.append((name, ctype))
        root = etree.Element(f"{{{CT}}}Types", nsmap={None: CT})
        for name, ctype in overrides:
            etree.SubElement(root, f"{{{CT}}}Override", PartName=name,
                             ContentType=ctype)
        z.writestr("[Content_Types].xml",
                   etree.tostring(root, xml_declaration=True,
                                  encoding="UTF-8", standalone=True))
    return len(parts)


if __name__ == "__main__":
    print(convert(sys.argv[1], sys.argv[2]), "parts")
