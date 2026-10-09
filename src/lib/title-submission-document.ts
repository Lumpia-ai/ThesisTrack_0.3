export type TitleSubmissionDocumentData = {
  documentId: string;
  groupId: string;
  groupName?: string;
  department: string;
  academicYear?: string;
  adviser: string;
  proposedTitle: string;
  description: string;
  background: string;
  statementOfProblem: string;
  objectives: string[];
  category?: string;
  keywords: string[];
  groupMembers: string[];
  status: string;
  submittedAt?: string;
  updatedAt?: string;
  lastReviewedAt?: string;
  latestReviewer?: string;
  latestAction?: string;
  validationStatus?: string;
  validationNote?: string;
  similarityScore?: number;
  similarTitles?: Array<{
    title: string;
    label?: string;
    similarityScore?: number;
  }>;
  attachments?: Array<{
    fileName: string;
    fileType: string;
    sizeLabel: string;
    uploadedAtLabel?: string;
    uploadedBy?: string;
    status?: string;
  }>;
  remarks?: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatDocumentDate(value?: string) {
  if (!value) {
    return 'Not recorded';
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(parsedDate);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 72);
}

function renderMetaItem(label: string, value?: string | number) {
  return `
    <div class="meta-item">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(String(value || 'Not recorded'))}</strong>
    </div>
  `;
}

function renderList(items: string[]) {
  if (!items.length) {
    return '<p class="muted">No entries recorded.</p>';
  }

  return `
    <ul>
      ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
    </ul>
  `;
}

function renderAttachmentList(items: NonNullable<TitleSubmissionDocumentData['attachments']>) {
  if (!items.length) {
    return '<p class="muted">No proposal files attached.</p>';
  }

  return `
    <ul>
      ${items
        .map((item) => {
          const meta = [item.fileType, item.sizeLabel, item.uploadedAtLabel, item.uploadedBy, item.status]
            .filter(Boolean)
            .join(' | ');
          return `<li><strong>${escapeHtml(item.fileName)}</strong>${meta ? `<br /><span class="muted">${escapeHtml(meta)}</span>` : ''}</li>`;
        })
        .join('')}
    </ul>
  `;
}

export function getTitleSubmissionDocumentFileName(data: TitleSubmissionDocumentData) {
  const titleSlug = slugify(data.proposedTitle || 'title-submission');
  const groupSlug = slugify(data.groupId || 'group');

  return `${groupSlug}-${titleSlug}-title-submission.html`;
}

export function createTitleSubmissionDocumentHtml(data: TitleSubmissionDocumentData) {
  const generatedAt = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date());
  const keywords = data.keywords.length ? data.keywords.join(', ') : 'No keywords recorded';
  const similarTitles = data.similarTitles ?? [];
  const attachments = data.attachments ?? [];

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(data.proposedTitle)} - Title Submission Document</title>
  <style>
    :root {
      color-scheme: light;
      --brand: #003a8f;
      --brand-dark: #1a1851;
      --accent: #f6be00;
      --ink: #111827;
      --muted: #64748b;
      --line: #dbe3ef;
      --surface: #f8fafc;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      background: #eef3f9;
      color: var(--ink);
      font-family: Inter, Arial, sans-serif;
      line-height: 1.55;
    }

    .toolbar {
      position: sticky;
      top: 0;
      z-index: 2;
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding: 1rem;
      background: rgba(248, 250, 252, 0.92);
      border-bottom: 1px solid var(--line);
      backdrop-filter: blur(12px);
    }

    button {
      min-height: 2.65rem;
      border: 0;
      border-radius: 8px;
      padding: 0 1rem;
      background: var(--brand);
      color: #fff;
      font: inherit;
      font-weight: 800;
      cursor: pointer;
    }

    button.secondary {
      background: #fff;
      color: var(--brand);
      border: 1px solid var(--line);
    }

    .document {
      width: min(920px, calc(100% - 2rem));
      margin: 1.5rem auto 3rem;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fff;
      box-shadow: 0 24px 80px rgba(15, 23, 42, 0.12);
      overflow: hidden;
    }

    .header {
      border-left: 8px solid var(--accent);
      padding: 2rem;
      background:
        linear-gradient(135deg, rgba(0, 58, 143, 0.08), rgba(246, 190, 0, 0.12)),
        #fff;
    }

    .kicker {
      margin: 0 0 0.8rem;
      color: var(--brand);
      font-size: 0.75rem;
      font-weight: 900;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }

    h1, h2, h3, p {
      margin-top: 0;
    }

    h1 {
      margin-bottom: 0.75rem;
      color: var(--brand-dark);
      font-size: clamp(1.8rem, 4vw, 2.45rem);
      line-height: 1.08;
      letter-spacing: -0.045em;
    }

    .subtitle {
      max-width: 720px;
      margin-bottom: 0;
      color: var(--muted);
      font-size: 0.98rem;
    }

    .content {
      padding: 2rem;
    }

    .meta-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 0.8rem;
      margin-bottom: 1.5rem;
    }

    .meta-item,
    .section {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--surface);
    }

    .meta-item {
      padding: 0.9rem;
    }

    .meta-item span,
    .label {
      display: block;
      color: var(--muted);
      font-size: 0.72rem;
      font-weight: 900;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    .meta-item strong {
      display: block;
      margin-top: 0.35rem;
      color: var(--ink);
      font-size: 0.9rem;
    }

    .section {
      margin-top: 1rem;
      padding: 1.15rem;
      background: #fff;
    }

    .section h2 {
      margin-bottom: 0.65rem;
      color: var(--brand-dark);
      font-size: 1rem;
      letter-spacing: -0.02em;
    }

    .section p {
      margin-bottom: 0;
      color: #334155;
    }

    ul {
      margin: 0.75rem 0 0;
      padding-left: 1.2rem;
      color: #334155;
    }

    li + li {
      margin-top: 0.35rem;
    }

    .status-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.65rem;
      margin-top: 1rem;
    }

    .pill {
      display: inline-flex;
      align-items: center;
      min-height: 2rem;
      border-radius: 999px;
      padding: 0 0.75rem;
      background: rgba(0, 58, 143, 0.08);
      color: var(--brand);
      font-size: 0.78rem;
      font-weight: 900;
    }

    .muted {
      color: var(--muted);
    }

    .footer {
      margin-top: 1.5rem;
      border-top: 1px solid var(--line);
      padding-top: 1rem;
      color: var(--muted);
      font-size: 0.8rem;
    }

    @media (max-width: 760px) {
      .meta-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media print {
      body {
        background: #fff;
      }

      .toolbar {
        display: none;
      }

      .document {
        width: 100%;
        margin: 0;
        border: 0;
        box-shadow: none;
      }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <button class="secondary" type="button" onclick="window.close()">Close</button>
    <button type="button" onclick="window.print()">Print / Save PDF</button>
  </div>

  <main class="document">
    <header class="header">
      <p class="kicker">ThesisTrack Title Submission Document</p>
      <h1>${escapeHtml(data.proposedTitle)}</h1>
      <p class="subtitle">${escapeHtml(data.description)}</p>
      <div class="status-row">
        <span class="pill">${escapeHtml(data.status)}</span>
        <span class="pill">${escapeHtml(data.department)}</span>
        <span class="pill">${escapeHtml(data.academicYear || 'Academic year not recorded')}</span>
      </div>
    </header>

    <section class="content">
      <div class="meta-grid">
        ${renderMetaItem('Document ID', data.documentId)}
        ${renderMetaItem('Group', data.groupName ? `${data.groupName} (${data.groupId})` : data.groupId)}
        ${renderMetaItem('Adviser', data.adviser)}
        ${renderMetaItem('Generated', generatedAt)}
        ${renderMetaItem('Submitted', formatDocumentDate(data.submittedAt))}
        ${renderMetaItem('Last Updated', formatDocumentDate(data.updatedAt))}
        ${renderMetaItem('Last Reviewed', formatDocumentDate(data.lastReviewedAt))}
        ${renderMetaItem('Latest Reviewer', data.latestReviewer)}
      </div>

      <section class="section">
        <span class="label">Official Title</span>
        <h2>${escapeHtml(data.proposedTitle)}</h2>
        <p>${escapeHtml(data.description)}</p>
      </section>

      <section class="section">
        <span class="label">Background</span>
        <p>${escapeHtml(data.background)}</p>
      </section>

      <section class="section">
        <span class="label">Statement of the Problem</span>
        <p>${escapeHtml(data.statementOfProblem)}</p>
      </section>

      <section class="section">
        <span class="label">Objectives</span>
        ${renderList(data.objectives)}
      </section>

      <section class="section">
        <span class="label">Study Classification</span>
        <h2>${escapeHtml(data.category || 'Not recorded')}</h2>
        <p><strong>Keywords:</strong> ${escapeHtml(keywords)}</p>
      </section>

      <section class="section">
        <span class="label">Group Members</span>
        ${renderList(data.groupMembers)}
      </section>

      <section class="section">
        <span class="label">Proposal Files</span>
        ${renderAttachmentList(attachments)}
      </section>

      <section class="section">
        <span class="label">Review Summary</span>
        <h2>${escapeHtml(data.latestAction || 'No adviser action recorded')}</h2>
        <p>${escapeHtml(data.remarks || 'No additional remarks recorded.')}</p>
      </section>

      <section class="section">
        <span class="label">Validation</span>
        <h2>${escapeHtml(data.validationStatus || 'Pending validation')}</h2>
        <p>${escapeHtml(data.validationNote || 'No validation note recorded.')}</p>
        ${
          typeof data.similarityScore === 'number'
            ? `<p style="margin-top:0.75rem;"><strong>Similarity score:</strong> ${data.similarityScore}%</p>`
            : ''
        }
        ${
          similarTitles.length
            ? `<ul>${similarTitles
                .map((item) => {
                  const label = item.label || (typeof item.similarityScore === 'number' ? `${item.similarityScore}% similarity` : '');
                  return `<li>${escapeHtml(item.title)}${label ? ` - ${escapeHtml(label)}` : ''}</li>`;
                })
                .join('')}</ul>`
            : '<p class="muted" style="margin-top:0.75rem;">No related title matches recorded.</p>'
        }
      </section>

      <p class="footer">
        This document was generated from the ThesisTrack title submission workspace. It is intended for adviser review, local archiving, and printable PDF export.
      </p>
    </section>
  </main>
</body>
</html>`;
}

export function openTitleSubmissionDocument(data: TitleSubmissionDocumentData) {
  const html = createTitleSubmissionDocumentHtml(data);
  const previewWindow = window.open('', '_blank');

  if (!previewWindow) {
    downloadTitleSubmissionDocument(data);
    return;
  }

  previewWindow.document.open();
  previewWindow.document.write(html);
  previewWindow.document.close();
  previewWindow.focus();
}

export function downloadTitleSubmissionDocument(data: TitleSubmissionDocumentData) {
  const html = createTitleSubmissionDocumentHtml(data);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = getTitleSubmissionDocumentFileName(data);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
