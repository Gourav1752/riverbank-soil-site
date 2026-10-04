# Riverbank Soil Study

Website for the project report **Assessment of Soil Mineral and Nutrient Deficiency Before and After Flooding Near Riverbanks**.

A static site (plain HTML, CSS and JavaScript, no build step) ready for GitHub Pages.

## Pages

| File | Content | Report sections |
|---|---|---|
| `index.html` | Abstract, problem statement, aim, objectives, overall framework | 1, 3, 4, 22 |
| `background.html` | Introduction, macro- and micronutrients, effect of flooding on each nutrient | 2, 6, 7 |
| `methodology.html` | Study area, sampling zones A/B/C, sampling stages, parameters, field checklist | 5, 8, 9 |
| `data.html` | **Data sheet tool**: before/after values per zone, change and % change, deficiency status, chart, findings, zone comparison, CSV import/export | 10–13 |
| `crops.html` | **Crop finder**, selection criteria, crop suitability table, pulses | 14 |
| `fertilizers.html` | Fertilizer sources, crop–fertilizer table, management process, precautions checklist | 15–17, 19 |
| `outlook.html` | Environmental significance, limitations, conclusion, future scope | 18–21 |
| `404.html` | Not-found page used by GitHub Pages | |

## Publish on GitHub Pages

1. Create a new repository on GitHub (for example `riverbank-soil-study`).
2. Upload **the contents of this folder** (not the folder itself) to the repository root, so `index.html` sits at the top level. Include the hidden `.nojekyll` file.
   - Web: *Add file → Upload files*, drag everything in, commit.
   - Or with git:
     ```bash
     git init
     git add .
     git commit -m "Riverbank Soil Study website"
     git branch -M main
     git remote add origin https://github.com/<your-username>/riverbank-soil-study.git
     git push -u origin main
     ```
3. In the repository go to **Settings → Pages**. Under *Build and deployment* choose **Deploy from a branch**, branch **main**, folder **/ (root)**, then **Save**.
4. After a minute the site is live at `https://<your-username>.github.io/riverbank-soil-study/`.

## Preview locally

```bash
python3 -m http.server 8000
```
Then open http://localhost:8000.

## How the data sheet works

- Enter laboratory values for each zone (A near the bank, B medium distance, C reference).
- **Change** = After − Before; **% change** = (After − Before) / Before × 100 (Section 11).
- A parameter is **stable** when its % change is within the tolerance (default ±5%, adjustable).
- Enter the **critical limit** from your soil-test report to flag deficiency automatically (value below the limit = deficient). Without a limit, choose the status from the drop-down.
- Data is saved in the visitor's browser (localStorage). Use **Download CSV** to keep a copy and **Import CSV** to load it on another device.
- The Crops page can read the deficiencies for any zone (*Deficiencies from my data sheet*).

The potassium row of Sample A starts with the report's worked example (150 → 120 mg/kg). Remove it before entering real results.

## Editing

- Text lives directly in the `.html` files.
- Colours, fonts and layout are in `assets/css/style.css` (colour tokens at the top, with a dark-theme set).
- Parameters, units and interpretation text for the data sheet are in `assets/js/soil-core.js`.
- Crop rules and fertilizer sources for the crop finder are in `assets/js/advisor.js`. Crop season tags (kharif/rabi) follow general Indian practice; the report itself only ties wheat to the rabi season.
- To add authors, an institution or a supervisor, edit the footer block that appears at the bottom of each page.
