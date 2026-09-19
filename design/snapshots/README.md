# Design snapshots (backup phong khi mat phien lam viec)

Thu muc nay chua ban xuat SVG tinh (khong phai file thiet ke song) cua tung Section/frame da hoan tat, dung lam phao cuu ho khi ca 2 agent deu khong con truy cap duoc file Figma/Penpot goc.

Quy uoc dat ten: `design/snapshots/<backend>/<ten-section>/<ten-frame>.svg`
- `design/snapshots/figma/...svg` — xuat bang `download_assets(fileKey, nodeId, defaultFormat: "svg")`
- `design/snapshots/penpot/...svg` — xuat bang `export_shape(shapeId, format: "svg")` (shapeId co the la id 1 frame, hoac "page" de xuat ca trang hien tai)

SVG o day CHI de tham chieu hinh anh / doi chieu truc quan. KHONG dung de tiep tuc chinh sua — muon lam tiep thi phai noi MCP vao dung file dang la "ban chinh" ghi trong design/PROGRESS.md.
