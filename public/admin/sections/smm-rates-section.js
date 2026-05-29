(function () {
    const state = {
        rates: [],
        allSmmServices: [],
        platformOptions: [],
        categoryOptions: [],
        currentVariants: [],
        editingServiceId: '',
        editingPlatformId: '',
        serviceToDeleteId: null,
        modalBindingsReady: false,
        activePlatformFilter: 'All'
    };

    const SECTION_HTML = {
        "smm-rates-section": `
            <div id="smm-rates-section" class="section" data-module-mounted="true">
                <style>
                    .smm-admin-shell {
                        --smm-accent: #0f766e;
                        --smm-accent-strong: #115e59;
                        --smm-ink: #0f172a;
                        --smm-subtle: #64748b;
                        --smm-line: rgba(148, 163, 184, 0.22);
                        --smm-surface: #ffffff;
                        --smm-surface-soft: linear-gradient(180deg, rgba(248, 250, 252, 0.92), rgba(255, 255, 255, 1));
                        --smm-shadow: 0 24px 60px rgba(15, 23, 42, 0.08);
                    }

                    #smm-rates-section .smm-panel {
                        background: #ffffff;
                        border: 1px solid var(--smm-line);
                        border-radius: 24px;
                        box-shadow: var(--smm-shadow);
                    }

                    #smm-rates-section .smm-toolbar {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        gap: 16px;
                        padding: 28px;
                        margin-bottom: 22px;
                    }

                    #smm-rates-section .smm-kicker {
                        display: inline-flex;
                        align-items: center;
                        gap: 8px;
                        padding: 8px 12px;
                        border-radius: 999px;
                        background: rgba(15, 118, 110, 0.1);
                        color: var(--smm-accent-strong);
                        font-size: 0.78rem;
                        font-weight: 800;
                        text-transform: uppercase;
                        letter-spacing: 0.08em;
                    }

                    #smm-rates-section .smm-title {
                        margin: 12px 0 6px;
                        color: var(--smm-ink);
                        font-size: 1.5rem;
                        font-weight: 800;
                    }

                    #smm-rates-section .smm-subtitle {
                        margin: 0;
                        color: var(--smm-subtle);
                        line-height: 1.6;
                        max-width: 720px;
                    }

                    #smm-rates-section .smm-toolbar-actions {
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        flex-wrap: wrap;
                    }

                    #smm-rates-section .smm-btn {
                        appearance: none;
                        -webkit-appearance: none;
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        gap: 8px;
                        border: 1px solid transparent;
                        border-radius: 16px;
                        padding: 12px 18px;
                        line-height: 1.1;
                        font-weight: 700;
                        text-decoration: none;
                        cursor: pointer;
                        box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08);
                        transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease, border-color 0.18s ease, color 0.18s ease;
                    }

                    #smm-rates-section .smm-btn:hover {
                        transform: translateY(-1px);
                    }

                    #smm-rates-section .smm-btn:focus-visible,
                    #smm-rates-section .smm-action-btn:focus-visible,
                    #smm-rates-section .smm-remove-variant:focus-visible,
                    #smm-rates-section .smm-close-btn:focus-visible {
                        outline: none;
                        box-shadow: 0 0 0 4px rgba(15, 118, 110, 0.14);
                    }

                    #smm-rates-section .smm-btn-primary {
                        background: linear-gradient(135deg, #0f766e, #0ea5a4);
                        color: #ffffff;
                        box-shadow: 0 18px 34px rgba(15, 118, 110, 0.24);
                    }

                    #smm-rates-section .smm-btn-primary:hover {
                        background: linear-gradient(135deg, #0f6b65, #139c9b);
                        box-shadow: 0 22px 38px rgba(15, 118, 110, 0.28);
                    }

                    #smm-rates-section .smm-btn-secondary {
                        background: linear-gradient(180deg, #f8fafc, #eef2f7);
                        border-color: rgba(203, 213, 225, 0.95);
                        color: #334155;
                        box-shadow: 0 10px 20px rgba(148, 163, 184, 0.12);
                    }

                    #smm-rates-section .smm-btn-secondary:hover {
                        background: linear-gradient(180deg, #f1f5f9, #e2e8f0);
                        border-color: rgba(148, 163, 184, 0.95);
                        color: #0f172a;
                    }

                    #smm-rates-section .smm-btn-ghost {
                        background: linear-gradient(180deg, #ffffff, #f8fafc);
                        border-color: rgba(203, 213, 225, 0.95);
                        color: #334155;
                        box-shadow: 0 10px 22px rgba(15, 23, 42, 0.05);
                    }

                    #smm-rates-section .smm-btn-ghost:hover {
                        background: linear-gradient(180deg, #ffffff, #f1f5f9);
                        border-color: rgba(148, 163, 184, 0.9);
                        color: #0f172a;
                    }

                    #smm-rates-section .smm-btn-soft {
                        background: linear-gradient(180deg, #f8fafc, #eef2f7);
                        border-color: rgba(203, 213, 225, 0.95);
                        color: #334155;
                        box-shadow: none;
                    }

                    #smm-rates-section .smm-btn-soft:hover {
                        background: linear-gradient(180deg, #f1f5f9, #e2e8f0);
                        border-color: rgba(148, 163, 184, 0.95);
                        color: #0f172a;
                        box-shadow: 0 12px 24px rgba(148, 163, 184, 0.14);
                    }

                    #smm-rates-section .smm-table-wrap {
                        overflow: hidden;
                    }

                    #smm-rates-section .smm-filter-bar {
                        display: flex;
                        gap: 10px;
                        margin: 0 0 18px;
                        padding: 0 2px 4px;
                        overflow-x: auto;
                        scrollbar-width: thin;
                    }

                    #smm-rates-section .smm-filter-pill {
                        border: 1px solid rgba(203, 213, 225, 0.95);
                        border-radius: 999px;
                        padding: 10px 16px;
                        background: #f8fafc;
                        color: #475569;
                        font-size: 0.82rem;
                        font-weight: 800;
                        white-space: nowrap;
                        cursor: pointer;
                        transition: background 0.18s ease, color 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
                    }

                    #smm-rates-section .smm-filter-pill:hover {
                        transform: translateY(-1px);
                        border-color: rgba(15, 118, 110, 0.24);
                        color: var(--smm-ink);
                    }

                    #smm-rates-section .smm-filter-pill.active {
                        background: linear-gradient(135deg, #0f766e, #0ea5a4);
                        border-color: transparent;
                        color: #ffffff;
                        box-shadow: 0 14px 28px rgba(15, 118, 110, 0.18);
                    }

                    #smm-rates-section .smm-table-scroll {
                        overflow-x: auto;
                    }

                    #smm-rates-section .smm-table {
                        width: 100%;
                        border-collapse: collapse;
                    }

                    #smm-rates-section .smm-table thead th {
                        padding: 16px 20px;
                        text-align: left;
                        font-size: 0.77rem;
                        font-weight: 800;
                        letter-spacing: 0.06em;
                        text-transform: uppercase;
                        color: #475569;
                        background: rgba(248, 250, 252, 0.92);
                        border-bottom: 1px solid var(--smm-line);
                    }

                    #smm-rates-section .smm-table tbody td {
                        padding: 18px 20px;
                        vertical-align: top;
                        border-bottom: 1px solid rgba(226, 232, 240, 0.7);
                    }

                    #smm-rates-section .smm-service-meta strong {
                        display: block;
                        color: var(--smm-ink);
                        font-size: 0.97rem;
                        margin-bottom: 6px;
                    }

                    #smm-rates-section .smm-muted {
                        color: var(--smm-subtle);
                        font-size: 0.82rem;
                        line-height: 1.55;
                    }

                    #smm-rates-section .smm-badge-row {
                        display: flex;
                        gap: 8px;
                        flex-wrap: wrap;
                        margin-top: 10px;
                    }

                    #smm-rates-section .smm-badge {
                        display: inline-flex;
                        align-items: center;
                        padding: 5px 10px;
                        border-radius: 999px;
                        background: #ecfeff;
                        color: #155e75;
                        font-size: 0.74rem;
                        font-weight: 700;
                    }

                    #smm-rates-section .smm-badge-neutral {
                        background: #f1f5f9;
                        color: #475569;
                    }

                    #smm-rates-section .smm-price {
                        color: #0f766e;
                        font-size: 1rem;
                        font-weight: 800;
                    }

                    #smm-rates-section .smm-actions {
                        display: flex;
                        gap: 8px;
                        justify-content: flex-end;
                        flex-wrap: wrap;
                    }

                    #smm-rates-section .smm-action-btn {
                        appearance: none;
                        -webkit-appearance: none;
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        border: 1px solid transparent;
                        border-radius: 999px;
                        padding: 9px 14px;
                        line-height: 1;
                        font-size: 0.8rem;
                        font-weight: 700;
                        cursor: pointer;
                        box-shadow: 0 10px 20px rgba(15, 23, 42, 0.06);
                        transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease, border-color 0.18s ease, color 0.18s ease;
                    }

                    #smm-rates-section .smm-action-btn:hover {
                        transform: translateY(-1px);
                    }

                    #smm-rates-section .smm-action-edit {
                        background: linear-gradient(180deg, #ecfdf3, #dcfce7);
                        border-color: rgba(134, 239, 172, 0.95);
                        color: #166534;
                    }

                    #smm-rates-section .smm-action-edit:hover {
                        background: linear-gradient(180deg, #dcfce7, #bbf7d0);
                        box-shadow: 0 14px 24px rgba(34, 197, 94, 0.16);
                    }

                    #smm-rates-section .smm-action-delete {
                        background: linear-gradient(180deg, #fff1f2, #ffe4e6);
                        border-color: rgba(253, 164, 175, 0.9);
                        color: #be123c;
                    }

                    #smm-rates-section .smm-action-delete:hover {
                        background: linear-gradient(180deg, #ffe4e6, #fecdd3);
                        box-shadow: 0 14px 24px rgba(244, 63, 94, 0.14);
                    }

                    .smm-modal-overlay {
                        display: none;
                        position: fixed;
                        inset: 0;
                        z-index: 9999;
                        background: rgba(15, 23, 42, 0.74);
                        backdrop-filter: blur(10px);
                        padding: 24px;
                        align-items: center;
                        justify-content: center;
                    }

                    .smm-modal-dialog {
                        width: min(1080px, 100%);
                        max-height: calc(100vh - 48px);
                        overflow: hidden;
                        background: #ffffff;
                        border-radius: 28px;
                        border: 1px solid rgba(255, 255, 255, 0.92);
                        box-shadow: 0 36px 80px rgba(15, 23, 42, 0.22);
                        display: flex;
                        flex-direction: column;
                    }

                    .smm-modal-dialog.smm-platform-dialog {
                        width: min(560px, 100%);
                    }

                    .smm-modal-dialog.smm-platform-list-dialog {
                        width: min(760px, 100%);
                    }

                    #smm-rates-section #customDeleteModal {
                        display: none;
                        position: fixed;
                        inset: 0;
                        z-index: 10050;
                        background: rgba(15, 23, 42, 0.74);
                        backdrop-filter: blur(10px);
                        padding: 24px;
                        align-items: center;
                        justify-content: center;
                    }

                    #smm-rates-section #customDeleteModal:not(.hidden) {
                        display: flex;
                    }

                    #smm-rates-section #customDeleteModal.hidden {
                        display: none !important;
                    }

                    #smm-rates-section #customDeleteModal > div {
                        width: min(520px, 100%);
                        max-height: calc(100vh - 48px);
                        overflow: hidden;
                        background: #ffffff;
                        border-radius: 24px;
                        border: 1px solid rgba(255, 255, 255, 0.92);
                        box-shadow: 0 36px 80px rgba(15, 23, 42, 0.22);
                    }

                    #smm-rates-section .smm-delete-modal-card {
                        width: min(520px, 100%);
                        max-height: calc(100vh - 48px);
                        overflow: hidden;
                        background: #ffffff;
                        border-radius: 24px;
                        border: 1px solid rgba(255, 255, 255, 0.92);
                        box-shadow: 0 36px 80px rgba(15, 23, 42, 0.22);
                        padding: 28px;
                    }

                    #smm-rates-section .smm-delete-modal-title {
                        margin: 0 0 8px;
                        color: var(--smm-ink);
                        font-size: 1.35rem;
                        font-weight: 800;
                        letter-spacing: -0.02em;
                    }

                    #smm-rates-section .smm-delete-modal-copy {
                        margin: 0 0 24px;
                        color: var(--smm-subtle);
                        line-height: 1.65;
                        font-size: 0.95rem;
                    }

                    #smm-rates-section .smm-delete-modal-actions {
                        display: flex;
                        justify-content: flex-end;
                        gap: 12px;
                        flex-wrap: wrap;
                    }

                    #smm-rates-section .smm-delete-btn-secondary,
                    #smm-rates-section .smm-delete-btn-danger {
                        appearance: none;
                        -webkit-appearance: none;
                        border: 1px solid transparent;
                        border-radius: 14px;
                        padding: 11px 16px;
                        font-size: 0.92rem;
                        font-weight: 700;
                        line-height: 1;
                        cursor: pointer;
                        transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease, border-color 0.18s ease;
                    }

                    #smm-rates-section .smm-delete-btn-secondary:hover,
                    #smm-rates-section .smm-delete-btn-danger:hover {
                        transform: translateY(-1px);
                    }

                    #smm-rates-section .smm-delete-btn-secondary {
                        background: linear-gradient(180deg, #f8fafc, #eef2f7);
                        border-color: rgba(203, 213, 225, 0.95);
                        color: #334155;
                        box-shadow: 0 10px 20px rgba(148, 163, 184, 0.12);
                    }

                    #smm-rates-section .smm-delete-btn-secondary:hover {
                        background: linear-gradient(180deg, #f1f5f9, #e2e8f0);
                    }

                    #smm-rates-section .smm-delete-btn-danger {
                        background: linear-gradient(135deg, #dc2626, #ef4444);
                        color: #ffffff;
                        box-shadow: 0 16px 28px rgba(239, 68, 68, 0.22);
                    }

                    #smm-rates-section .smm-delete-btn-danger:hover {
                        background: linear-gradient(135deg, #b91c1c, #dc2626);
                        box-shadow: 0 18px 32px rgba(239, 68, 68, 0.28);
                    }

                    .smm-modal-header {
                        display: flex;
                        align-items: flex-start;
                        justify-content: space-between;
                        gap: 20px;
                        padding: 28px 30px 20px;
                        border-bottom: 1px solid rgba(226, 232, 240, 0.85);
                        background: #ffffff;
                    }

                    .smm-modal-title {
                        margin: 0 0 8px;
                        color: var(--smm-ink);
                        font-size: 1.32rem;
                        font-weight: 800;
                    }

                    .smm-modal-copy {
                        margin: 0;
                        color: var(--smm-subtle);
                        line-height: 1.55;
                    }

                    #smm-rates-section .smm-close-btn {
                        width: 42px;
                        height: 42px;
                        border: none;
                        border-radius: 14px;
                        background: rgba(255, 255, 255, 0.9);
                        color: #334155;
                        font-size: 1.25rem;
                        cursor: pointer;
                    }

                    #smm-rates-section .smm-modal-body {
                        padding: 26px 30px;
                        overflow-y: auto;
                        background: #ffffff;
                    }

                    .smm-form-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                        gap: 18px;
                    }

                    .smm-form-card {
                        background: linear-gradient(180deg, #ffffff, #f8fafc);
                        border: 1px solid rgba(226, 232, 240, 0.9);
                        border-radius: 22px;
                        padding: 22px;
                    }

                    .smm-form-card.smm-form-card-full {
                        grid-column: 1 / -1;
                    }

                    .smm-form-card h4 {
                        margin: 0 0 8px;
                        color: var(--smm-ink);
                        font-size: 1rem;
                        font-weight: 800;
                    }

                    .smm-form-card p {
                        margin: 0 0 18px;
                        color: var(--smm-subtle);
                        font-size: 0.84rem;
                        line-height: 1.55;
                    }

                    .smm-field-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
                        gap: 16px;
                    }

                    .smm-field {
                        display: flex;
                        flex-direction: column;
                        gap: 8px;
                    }

                    .smm-field label {
                        color: #334155;
                        font-size: 0.82rem;
                        font-weight: 700;
                    }

                    .smm-input,
                    .smm-select,
                    .smm-textarea {
                        width: 100%;
                        border: 1px solid #dbe3ee;
                        border-radius: 14px;
                        padding: 12px 14px;
                        background: #ffffff;
                        color: var(--smm-ink);
                        font-size: 0.94rem;
                        outline: none;
                        transition: border-color 0.18s ease, box-shadow 0.18s ease;
                    }

                    .smm-input:focus,
                    .smm-select:focus,
                    .smm-textarea:focus {
                        border-color: rgba(15, 118, 110, 0.5);
                        box-shadow: 0 0 0 4px rgba(15, 118, 110, 0.08);
                    }

                    .smm-textarea {
                        min-height: 130px;
                        resize: vertical;
                        font-family: inherit;
                    }

                    .smm-inline-toggle {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        padding: 12px 14px;
                        border-radius: 14px;
                        background: #f8fafc;
                        border: 1px solid rgba(226, 232, 240, 0.9);
                        color: #0f172a;
                        font-weight: 700;
                    }

                    .smm-inline-toggle input {
                        width: 18px;
                        height: 18px;
                        accent-color: var(--smm-accent);
                    }

                    .smm-dynamic-grid {
                        display: none;
                        margin-top: 16px;
                    }

                    .smm-add-new-wrap {
                        display: none;
                    }

                    .smm-error {
                        display: none;
                        margin: 0 0 18px;
                        padding: 12px 14px;
                        border-radius: 14px;
                        background: #fef2f2;
                        color: #b91c1c;
                        font-size: 0.84rem;
                        font-weight: 700;
                    }

                    .smm-variant-stack {
                        display: grid;
                        gap: 14px;
                    }

                    .smm-variant-card {
                        border: 1px solid rgba(203, 213, 225, 0.9);
                        border-radius: 18px;
                        padding: 18px;
                        background: #ffffff;
                    }

                    .smm-variant-head {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        gap: 12px;
                        margin-bottom: 14px;
                    }

                    .smm-variant-head strong {
                        color: var(--smm-ink);
                        font-size: 0.94rem;
                    }

                    #smm-rates-section .smm-remove-variant {
                        appearance: none;
                        -webkit-appearance: none;
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        border: 1px solid rgba(253, 164, 175, 0.95);
                        border-radius: 999px;
                        padding: 8px 12px;
                        background: linear-gradient(180deg, #fff1f2, #ffe4e6);
                        color: #be123c;
                        line-height: 1;
                        box-shadow: 0 8px 18px rgba(244, 63, 94, 0.08);
                        font-weight: 700;
                        cursor: pointer;
                        transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease, border-color 0.18s ease;
                    }

                    #smm-rates-section .smm-remove-variant:hover {
                        transform: translateY(-1px);
                        background: linear-gradient(180deg, #ffe4e6, #fecdd3);
                        box-shadow: 0 12px 24px rgba(244, 63, 94, 0.14);
                    }

                    #smm-rates-section .smm-modal-footer {
                        display: flex;
                        justify-content: space-between;
                        gap: 12px;
                        align-items: center;
                        padding: 20px 30px 28px;
                        border-top: 1px solid rgba(226, 232, 240, 0.85);
                        background: #ffffff;
                    }

                    #smm-rates-section .smm-modal-footer-actions {
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        flex-wrap: wrap;
                    }

                    #smm-rates-section .smm-logo-preview {
                        width: 64px;
                        height: 64px;
                        border-radius: 18px;
                        border: 1px solid rgba(203, 213, 225, 0.95);
                        background: #f8fafc;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        overflow: hidden;
                        color: #475569;
                        font-size: 1.3rem;
                        font-weight: 800;
                    }

                    #smm-rates-section .smm-platform-table {
                        width: 100%;
                        border-collapse: collapse;
                        background: #ffffff;
                    }

                    #smm-rates-section .smm-platform-table th,
                    #smm-rates-section .smm-platform-table td {
                        padding: 14px 16px;
                        border-bottom: 1px solid rgba(226, 232, 240, 0.85);
                        text-align: left;
                        background: #ffffff;
                    }

                    #smm-rates-section .smm-platform-table th {
                        font-size: 0.77rem;
                        text-transform: uppercase;
                        letter-spacing: 0.06em;
                        color: #64748b;
                    }

                    #smm-rates-section .smm-platform-table tbody tr,
                    #smm-rates-section .smm-platform-table tbody tr:nth-child(even),
                    #smm-rates-section .smm-platform-table tbody tr:hover,
                    #smm-rates-section .smm-platform-table tbody td {
                        background: #ffffff !important;
                    }

                    #smm-rates-section .smm-table tbody tr,
                    #smm-rates-section .smm-table tbody tr:nth-child(even),
                    #smm-rates-section .smm-table tbody tr:hover,
                    #smm-rates-section .smm-table tbody td {
                        background: #ffffff !important;
                    }

                    @media (max-width: 900px) {
                        #smm-rates-section .smm-toolbar {
                            flex-direction: column;
                            align-items: flex-start;
                        }

                        .smm-modal-overlay {
                            padding: 12px;
                        }

                        #smm-rates-section .smm-modal-dialog,
                        #smm-rates-section .smm-modal-dialog.smm-platform-dialog,
                        #smm-rates-section .smm-modal-dialog.smm-platform-list-dialog {
                            width: 100%;
                            border-radius: 22px;
                        }

                        #smm-rates-section .smm-modal-header,
                        #smm-rates-section .smm-modal-body,
                        #smm-rates-section .smm-modal-footer {
                            padding-left: 18px;
                            padding-right: 18px;
                        }

                        #smm-rates-section .smm-modal-footer {
                            flex-direction: column;
                            align-items: stretch;
                        }

                        #smm-rates-section .smm-modal-footer-actions {
                            width: 100%;
                            justify-content: stretch;
                        }
                    }
                </style>

                <div class="premium-section smm-admin-shell">
                    <div class="smm-panel smm-toolbar">
                        <div>
                            <span class="smm-kicker">Premium SMM Control</span>
                            <h2 class="smm-title">SMM Service Ecosystem</h2>
                            <p class="smm-subtitle">Manage category-level SMM services with clean variant pricing, dynamic user input rules, and safer data handling across the admin panel.</p>
                        </div>
                        <div class="smm-toolbar-actions">
                            <button type="button" class="smm-btn smm-btn-secondary" onclick="window.openManagePlatformsModal()">Manage Platforms</button>
                            <button type="button" class="smm-btn smm-btn-primary" onclick="window.openSmmServiceModal()">+ Add Service</button>
                        </div>
                    </div>

                    <div id="platformFilters" class="smm-filter-bar" aria-label="Platform filters"></div>

                    <div class="smm-panel smm-table-wrap">
                        <div class="smm-table-scroll">
                            <table class="smm-table">
                                <thead>
                                    <tr>
                                        <th>Platform</th>
                                        <th>Category</th>
                                        <th>Details</th>
                                        <th>Starting Price</th>
                                        <th>Updated</th>
                                        <th style="text-align:right;">Actions</th>
                                    </tr>
                                </thead>
                                <tbody id="smmRatesTable">
                                    <tr>
                                        <td colspan="6" style="padding:28px;text-align:center;color:#64748b;">Loading SMM services...</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div id="smmServiceModal" class="smm-modal-overlay">
                    <div class="smm-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="smmServiceModalTitle">
                        <div class="smm-modal-header">
                            <div>
                                <h3 id="smmServiceModalTitle" class="smm-modal-title">Add SMM Service</h3>
                                <p class="smm-modal-copy">Create or update a clean category-level service record. Platform and category are DB-aware, while variants carry the sellable pricing options.</p>
                            </div>
                            <button type="button" class="smm-close-btn" onclick="window.closeSmmServiceModal()">×</button>
                        </div>
                        <div class="smm-modal-body">
                            <p id="smmServiceError" class="smm-error"></p>
                            <div class="smm-form-grid">
                                <section class="smm-form-card">
                                    <h4>Basics</h4>
                                    <p>Choose an existing platform/category or create a new one on the fly without leaving this modal.</p>
                                    <div class="smm-field-grid">
                                        <div class="smm-field">
                                            <label for="smmPlatform">Platform</label>
                                            <select id="smmPlatform" class="smm-select" onchange="window.handleSmmPlatformSelectChange()"></select>
                                        </div>
                                        <div class="smm-field smm-add-new-wrap" id="smmPlatformCustomWrap">
                                            <label for="smmPlatformCustom">New Platform Name</label>
                                            <input id="smmPlatformCustom" class="smm-input" type="text" placeholder="e.g. LinkedIn">
                                        </div>
                                        <div class="smm-field">
                                            <label for="smmCategory">Category</label>
                                            <select id="smmCategory" class="smm-select" onchange="window.handleSmmCategorySelectChange()"></select>
                                        </div>
                                        <div class="smm-field smm-add-new-wrap" id="smmCategoryCustomWrap">
                                            <label for="smmCategoryCustom">New Category Name</label>
                                            <input id="smmCategoryCustom" class="smm-input" type="text" placeholder="e.g. Subscribers">
                                        </div>
                                    </div>
                                </section>

                                <section class="smm-form-card">
                                    <h4>Rules & Copy</h4>
                                    <p>This description appears as the service rules/info block on the user side.</p>
                                    <div class="smm-field">
                                        <label for="smmDescription">Description</label>
                                        <textarea id="smmDescription" class="smm-textarea" placeholder="Important rules, delivery notes, or service info..."></textarea>
                                    </div>
                                </section>

                                <section class="smm-form-card smm-form-card-full">
                                    <h4>Variant Builder</h4>
                                    <p>Each variant represents a sellable option. Country, speed, and refill can stay blank if they do not apply.</p>
                                    <div id="smmVariantsContainer" class="smm-variant-stack"></div>
                                    <div style="margin-top:16px;">
                                        <button type="button" class="smm-btn smm-btn-secondary" onclick="window.addSmmVariant()">+ Add Variant</button>
                                    </div>
                                </section>
                            </div>
                        </div>
                        <div class="smm-modal-footer">
                            <span class="smm-muted">Changes save directly to the canonical SMM service schema.</span>
                            <div class="smm-modal-footer-actions">
                                <button type="button" class="smm-btn smm-btn-secondary" onclick="window.closeSmmServiceModal()">Cancel</button>
                                <button type="button" class="smm-btn smm-btn-primary" id="smmServiceSaveButton" onclick="window.saveSmmService()">Save Service</button>
                            </div>
                        </div>
                    </div>
                </div>

                <div id="managePlatformsModal" class="smm-modal-overlay">
                    <div class="smm-modal-dialog smm-platform-list-dialog" role="dialog" aria-modal="true" aria-labelledby="managePlatformsTitle">
                        <div class="smm-modal-header">
                            <div>
                                <h3 id="managePlatformsTitle" class="smm-modal-title">Platform Branding</h3>
                                <p class="smm-modal-copy">Review, edit, or remove branded platform entries used by the public SMM platform selector.</p>
                            </div>
                            <button type="button" class="smm-close-btn" onclick="window.closeManagePlatformsModal()">×</button>
                        </div>
                        <div class="smm-modal-body">
                            <div style="display:flex;justify-content:flex-end;margin-bottom:16px;">
                                <button type="button" class="smm-btn smm-btn-primary" onclick="window.openPlatformBrandingModal()">+ Add Platform Branding</button>
                            </div>
                            <div class="smm-panel" style="border-radius:20px;overflow:hidden;">
                                <table class="smm-platform-table">
                                    <thead>
                                        <tr>
                                            <th style="width:92px;">Logo</th>
                                            <th>Name</th>
                                            <th style="text-align:right;">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="managePlatformsTableBody">
                                        <tr><td colspan="3" style="color:#64748b;">Loading platforms...</td></tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                <div id="platformBrandingModal" class="smm-modal-overlay">
                    <div class="smm-modal-dialog smm-platform-dialog" role="dialog" aria-modal="true" aria-labelledby="platformBrandingTitle">
                        <div class="smm-modal-header">
                            <div>
                                <h3 id="platformBrandingTitle" class="smm-modal-title">Platform Branding</h3>
                                <p class="smm-modal-copy">Add or update the public logo used for a specific SMM platform.</p>
                            </div>
                            <button type="button" class="smm-close-btn" onclick="window.closePlatformBrandingModal()">×</button>
                        </div>
                        <div class="smm-modal-body">
                            <div class="smm-field" style="margin-bottom:18px;">
                                <label for="platformBrandingName">Platform Name</label>
                                <input id="platformBrandingName" class="smm-input" type="text" placeholder="e.g. Instagram">
                            </div>
                            <div class="smm-field">
                                <label>Platform Logo</label>
                                <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
                                    <div id="platformBrandingPreview" class="smm-logo-preview">🌐</div>
                                    <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
                                        <input id="platformBrandingLogoFile" type="file" accept="image/*" style="display:none;" onchange="window.handlePlatformLogoUpload(event)">
                                        <input id="platformBrandingLogoUrl" type="hidden">
                                        <button type="button" class="smm-btn smm-btn-ghost" onclick="document.getElementById('platformBrandingLogoFile').click()">Choose Logo</button>
                                        <span id="platformBrandingUploadStatus" class="smm-muted"></span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="smm-modal-footer">
                            <span class="smm-muted">If no logo is uploaded, the default platform image will be used.</span>
                            <div class="smm-modal-footer-actions">
                                <button type="button" class="smm-btn smm-btn-secondary" onclick="window.closePlatformBrandingModal()">Cancel</button>
                                <button type="button" class="smm-btn smm-btn-primary" onclick="window.submitPlatformBranding()">Save Branding</button>
                            </div>
                        </div>
                    </div>
                </div>

                <div id="customDeleteModal" class="hidden fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm transition-opacity">
                    <div class="smm-delete-modal-card">
                        <h3 class="smm-delete-modal-title">Delete Service?</h3>
                        <p class="smm-delete-modal-copy">Are you sure you want to delete <span id="deleteModalServiceName" class="font-semibold text-gray-800"></span>? This action cannot be undone and will remove all its variants.</p>
                        <div class="smm-delete-modal-actions">
                            <button id="cancelDeleteBtn" type="button" class="smm-delete-btn-secondary">Cancel</button>
                            <button id="confirmDeleteBtn" type="button" class="smm-delete-btn-danger">Yes, Delete</button>
                        </div>
                    </div>
                </div>
            </div>
        `
    };

    function normalizeText(value) {
        return (value == null ? '' : String(value)).trim();
    }

    function sameText(left, right) {
        return normalizeText(left).toLowerCase() === normalizeText(right).toLowerCase();
    }

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function mountSections(sectionIds) {
        sectionIds.forEach((sectionId) => {
            const target = document.getElementById(sectionId);
            const markup = SECTION_HTML[sectionId];
            if (!target || !markup || target.dataset.moduleMounted === 'true') return;
            target.outerHTML = markup;
        });
    }

    function cloneVariant(variant = {}) {
        const inferredInputType = normalizeText(variant.inputType) === 'textarea'
            ? 'textarea'
            : (normalizeText(variant.inputType) === 'text' ? 'text' : 'none');
        const inferredHasDynamicInput = variant.hasDynamicInput === true
            || inferredInputType !== 'none'
            || Boolean(normalizeText(variant.inputLabel));

        return {
            name: normalizeText(variant.name),
            country: normalizeText(variant.country),
            speed: normalizeText(variant.speed),
            refill: normalizeText(variant.refill),
            variantId: variant.variantId != null ? String(variant.variantId) : '',
            hasDynamicInput: inferredHasDynamicInput,
            inputType: inferredHasDynamicInput ? (inferredInputType === 'textarea' ? 'textarea' : 'text') : 'none',
            inputLabel: normalizeText(variant.inputLabel),
            price: variant.price != null ? String(variant.price) : '',
            discountPercent: variant.discountPercent != null ? String(variant.discountPercent) : '0',
            minQty: variant.minQty != null ? String(variant.minQty) : '10',
            maxQty: variant.maxQty != null ? String(variant.maxQty) : '10000',
            legacyServiceIds: Array.isArray(variant.legacyServiceIds) ? [...variant.legacyServiceIds] : []
        };
    }

    function makeEmptyVariant() {
        return {
            name: '',
            country: '',
            speed: '',
            refill: '',
            variantId: '',
            hasDynamicInput: false,
            inputType: 'none',
            inputLabel: '',
            price: '',
            discountPercent: '0',
            minQty: '10',
            maxQty: '10000',
            legacyServiceIds: []
        };
    }

    function showServiceError(message) {
        const errorEl = document.getElementById('smmServiceError');
        if (!errorEl) return;
        errorEl.textContent = normalizeText(message);
        errorEl.style.display = message ? 'block' : 'none';
    }

    function setModalOpen(modalId, isOpen) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = isOpen ? 'flex' : 'none';
        }
    }

    function formatUpdatedAt(value) {
        if (!value) return '—';
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) return '—';
        return parsed.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
    }

    function getLowestVariantPrice(variants) {
        const prices = (Array.isArray(variants) ? variants : [])
            .map((variant) => Number(variant?.price))
            .filter((price) => Number.isFinite(price) && price > 0);
        if (!prices.length) return null;
        return Math.min(...prices);
    }

    function buildVariantMetaSummary(variants) {
        const variantCount = Array.isArray(variants) ? variants.length : 0;
        return `${variantCount} variant${variantCount === 1 ? '' : 's'}`;
    }

    async function fetchAdminSmmOptions(platformName = '') {
        const query = platformName ? `?platform=${encodeURIComponent(platformName)}` : '';
        const res = await fetch(`/api/admin/smm/options${query}`, { credentials: 'include' });
        const data = await res.json();
        if (!data.success) {
            throw new Error(data.error || 'Failed to load SMM options.');
        }
        return data;
    }

    function resolvePlatformSelection(fallback = '') {
        const select = document.getElementById('smmPlatform');
        const input = document.getElementById('smmPlatformCustom');
        if (!select) return fallback;
        if (select.value === '__add_new__') {
            return normalizeText(input?.value) || fallback;
        }
        return normalizeText(select.value) || fallback;
    }

    function resolveCategorySelection(fallback = '') {
        const select = document.getElementById('smmCategory');
        const input = document.getElementById('smmCategoryCustom');
        if (!select) return fallback;
        if (select.value === '__add_new__') {
            return normalizeText(input?.value) || fallback;
        }
        return normalizeText(select.value) || fallback;
    }

    function toggleAddNewWrap(selectId, wrapId, shouldShow, seedValue = '') {
        const wrap = document.getElementById(wrapId);
        if (!wrap) return;
        wrap.style.display = shouldShow ? 'flex' : 'none';
        const input = wrap.querySelector('input');
        if (input && shouldShow && seedValue && !normalizeText(input.value)) {
            input.value = seedValue;
        }
        if (input && shouldShow) {
            input.focus();
        }
        if (input && !shouldShow && !seedValue) {
            input.value = '';
        }
        const select = document.getElementById(selectId);
        if (select) {
            select.style.display = 'block';
        }
    }

    function populatePlatformSelect(selectedValue = '') {
        const select = document.getElementById('smmPlatform');
        if (!select) return;

        const options = [...state.platformOptions];
        if (selectedValue && selectedValue !== '__add_new__' && !options.some((option) => sameText(option, selectedValue))) {
            options.unshift(selectedValue);
        }

        select.innerHTML = options
            .map((option) => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`)
            .join('') + '<option value="__add_new__">[+ Add New]</option>';

        if (selectedValue) {
            if (options.some((option) => sameText(option, selectedValue))) {
                select.value = options.find((option) => sameText(option, selectedValue)) || selectedValue;
                toggleAddNewWrap('smmPlatform', 'smmPlatformCustomWrap', false);
            } else {
                select.value = '__add_new__';
                toggleAddNewWrap('smmPlatform', 'smmPlatformCustomWrap', true, selectedValue);
            }
        } else if (options.length) {
            select.value = options[0];
            toggleAddNewWrap('smmPlatform', 'smmPlatformCustomWrap', false);
        } else {
            select.value = '__add_new__';
            toggleAddNewWrap('smmPlatform', 'smmPlatformCustomWrap', true);
        }
    }

    function populateCategorySelect(selectedValue = '') {
        const select = document.getElementById('smmCategory');
        if (!select) return;

        const options = [...state.categoryOptions];
        if (selectedValue && selectedValue !== '__add_new__' && !options.some((option) => sameText(option, selectedValue))) {
            options.unshift(selectedValue);
        }

        select.innerHTML = options
            .map((option) => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`)
            .join('') + '<option value="__add_new__">[+ Add New]</option>';

        if (selectedValue) {
            if (options.some((option) => sameText(option, selectedValue))) {
                select.value = options.find((option) => sameText(option, selectedValue)) || selectedValue;
                toggleAddNewWrap('smmCategory', 'smmCategoryCustomWrap', false);
            } else {
                select.value = '__add_new__';
                toggleAddNewWrap('smmCategory', 'smmCategoryCustomWrap', true, selectedValue);
            }
        } else if (options.length) {
            select.value = options[0];
            toggleAddNewWrap('smmCategory', 'smmCategoryCustomWrap', false);
        } else {
            select.value = '__add_new__';
            toggleAddNewWrap('smmCategory', 'smmCategoryCustomWrap', true);
        }
    }

    async function refreshCategoryOptions(platformName = '', selectedCategory = '') {
        if (!normalizeText(platformName)) {
            state.categoryOptions = [];
            populateCategorySelect(selectedCategory || '__add_new__');
            return;
        }

        const data = await fetchAdminSmmOptions(platformName);
        state.categoryOptions = Array.isArray(data.categories) ? data.categories : [];
        populateCategorySelect(selectedCategory);
    }

    async function refreshAdminSmmOptions(selectedPlatform = '', selectedCategory = '') {
        const data = await fetchAdminSmmOptions();
        state.platformOptions = Array.isArray(data.platforms) ? data.platforms : [];
        populatePlatformSelect(selectedPlatform);

        const platformToUse = selectedPlatform || resolvePlatformSelection() || state.platformOptions[0] || '';
        if (normalizeText(platformToUse)) {
            await refreshCategoryOptions(platformToUse, selectedCategory);
        } else {
            state.categoryOptions = [];
            populateCategorySelect(selectedCategory || '__add_new__');
        }
    }

    function renderVariants() {
        const container = document.getElementById('smmVariantsContainer');
        if (!container) return;

        if (!state.currentVariants.length) {
            state.currentVariants = [makeEmptyVariant()];
        }

        container.innerHTML = state.currentVariants.map((variant, index) => `
            <article class="smm-variant-card">
                <div class="smm-variant-head">
                    <strong>Variant ${index + 1}</strong>
                    <input type="hidden" class="variant-id-input" value="${escapeHtml(variant.variantId || '')}">
                    <button type="button" class="smm-remove-variant" onclick="window.removeSmmVariant(${index})">Remove</button>
                </div>
                <div class="smm-field-grid">
                    <div class="smm-field">
                        <label>Name</label>
                        <input type="text" class="smm-input" value="${escapeHtml(variant.name)}" placeholder="e.g. Standard, Premium" oninput="window.updateSmmVariant(${index}, 'name', this.value)">
                    </div>
                    <div class="smm-field">
                        <label>Country <span class="smm-muted">(Optional)</span></label>
                        <input type="text" class="smm-input" value="${escapeHtml(variant.country)}" placeholder="e.g. Global" oninput="window.updateSmmVariant(${index}, 'country', this.value)">
                    </div>
                    <div class="smm-field">
                        <label>Speed <span class="smm-muted">(Optional)</span></label>
                        <input type="text" class="smm-input" value="${escapeHtml(variant.speed)}" placeholder="e.g. 1K/day" oninput="window.updateSmmVariant(${index}, 'speed', this.value)">
                    </div>
                    <div class="smm-field">
                        <label>Refill <span class="smm-muted">(Optional)</span></label>
                        <input type="text" class="smm-input" value="${escapeHtml(variant.refill)}" placeholder="e.g. 30 Days Refill" oninput="window.updateSmmVariant(${index}, 'refill', this.value)">
                    </div>
                    <div class="smm-field">
                        <label>Price / 1K</label>
                        <input type="number" min="0.01" step="0.01" class="smm-input" value="${escapeHtml(variant.price)}" placeholder="e.g. 150" oninput="window.updateSmmVariant(${index}, 'price', this.value)">
                    </div>
                    <div class="smm-field">
                        <label>Discount (%) <span class="smm-muted">(Optional)</span></label>
                        <input type="number" min="0" max="100" step="0.01" class="smm-input variant-discount-input" value="${escapeHtml(variant.discountPercent)}" placeholder="e.g. 10" oninput="window.updateSmmVariant(${index}, 'discountPercent', this.value)">
                    </div>
                    <div class="smm-field">
                        <label>Min Quantity</label>
                        <input type="number" min="1" step="1" class="smm-input" value="${escapeHtml(variant.minQty)}" oninput="window.updateSmmVariant(${index}, 'minQty', this.value)">
                    </div>
                    <div class="smm-field">
                        <label>Max Quantity</label>
                        <input type="number" min="1" step="1" class="smm-input" value="${escapeHtml(variant.maxQty)}" oninput="window.updateSmmVariant(${index}, 'maxQty', this.value)">
                    </div>
                    <div class="smm-field" style="grid-column: 1 / -1;">
                        <label class="smm-inline-toggle" style="margin:0;">
                            <input type="checkbox" ${variant.hasDynamicInput ? 'checked' : ''} onchange="window.toggleSmmVariantDynamicFields(${index}, this.checked)">
                            <span>Require additional user input</span>
                        </label>
                    </div>
                    <div class="smm-field-grid smm-dynamic-grid" style="grid-column: 1 / -1; display: ${variant.hasDynamicInput ? 'grid' : 'none'};">
                        <div class="smm-field">
                            <label>Input Type</label>
                            <select class="smm-select" onchange="window.updateSmmVariant(${index}, 'inputType', this.value)">
                                <option value="text" ${variant.inputType === 'text' ? 'selected' : ''}>Short Text</option>
                                <option value="textarea" ${variant.inputType === 'textarea' ? 'selected' : ''}>Textarea</option>
                            </select>
                        </div>
                        <div class="smm-field" style="grid-column: 1 / -1;">
                            <label>Input Label</label>
                            <input type="text" class="smm-input" value="${escapeHtml(variant.inputLabel)}" placeholder="e.g. Enter Custom Comments (1 per line)" oninput="window.updateSmmVariant(${index}, 'inputLabel', this.value)">
                        </div>
                    </div>
                </div>
            </article>
        `).join('');
    }

    function fillServiceForm(service) {
        document.getElementById('smmDescription').value = normalizeText(service?.description);

        state.currentVariants = (Array.isArray(service?.variants) && service.variants.length ? service.variants : [makeEmptyVariant()]).map(cloneVariant);
        renderVariants();
    }

    async function resetServiceForm() {
        state.editingServiceId = '';
        state.currentVariants = [makeEmptyVariant()];
        showServiceError('');

        const title = document.getElementById('smmServiceModalTitle');
        const saveButton = document.getElementById('smmServiceSaveButton');
        if (title) title.textContent = 'Add SMM Service';
        if (saveButton) saveButton.textContent = 'Save Service';

        document.getElementById('smmDescription').value = '';
        await refreshAdminSmmOptions();
        renderVariants();
    }

    function getServiceById(serviceId) {
        return state.rates.find((rate) => sameText(rate?.serviceId, serviceId)) || null;
    }

    function buildDetailsCell(rate) {
        const description = normalizeText(rate?.description);
        const variants = Array.isArray(rate?.variants) ? rate.variants : [];
        const summary = buildVariantMetaSummary(variants);
        const dynamicBadge = variants.some((variant) => variant?.hasDynamicInput === true)
            ? '<span class="smm-badge">Dynamic Input</span>'
            : '<span class="smm-badge smm-badge-neutral">Static Checkout</span>';
        const descriptionHtml = description
            ? `<span class="smm-muted">${escapeHtml(description.length > 110 ? `${description.slice(0, 107)}...` : description)}</span>`
            : '<span class="smm-muted">No description added yet.</span>';

        return `
            <div class="smm-service-meta">
                <strong>${escapeHtml(summary)}</strong>
                ${descriptionHtml}
                <div class="smm-badge-row">
                    ${dynamicBadge}
                </div>
            </div>
        `;
    }

    function getFilteredRates(platformName = state.activePlatformFilter) {
        if (sameText(platformName, 'All')) {
            return [...state.allSmmServices];
        }

        return state.allSmmServices.filter((rate) => sameText(rate?.platform, platformName));
    }

    function renderPlatformFilters() {
        const container = document.getElementById('platformFilters');
        if (!container) return;

        const uniquePlatforms = state.allSmmServices
            .map((rate) => normalizeText(rate?.platform))
            .filter(Boolean)
            .filter((platform, index, platforms) => platforms.findIndex((entry) => sameText(entry, platform)) === index)
            .sort((left, right) => left.localeCompare(right));

        const activeFilter = sameText(state.activePlatformFilter, 'All')
            || uniquePlatforms.some((platform) => sameText(platform, state.activePlatformFilter))
            ? state.activePlatformFilter
            : 'All';

        state.activePlatformFilter = activeFilter;

        container.innerHTML = ['All', ...uniquePlatforms].map((platform) => `
            <button
                type="button"
                class="smm-filter-pill ${sameText(activeFilter, platform) ? 'active' : ''}"
                data-platform="${escapeHtml(platform)}"
                onclick="window.handleSmmPlatformFilterClick(this.dataset.platform || 'All')"
            >
                ${escapeHtml(platform)}
            </button>
        `).join('');
    }

    function renderRatesTable(rates = state.rates) {
        const tbody = document.getElementById('smmRatesTable');
        if (!tbody) return;

        if (!state.allSmmServices.length) {
            tbody.innerHTML = '<tr><td colspan="6" style="padding:28px;text-align:center;color:#64748b;">No SMM services defined yet. Create the first one to get started.</td></tr>';
            return;
        }

        if (!rates.length) {
            const label = sameText(state.activePlatformFilter, 'All') ? 'the selected platform' : state.activePlatformFilter;
            tbody.innerHTML = `<tr><td colspan="6" style="padding:28px;text-align:center;color:#64748b;">No SMM services match ${escapeHtml(label)} right now.</td></tr>`;
            return;
        }

        tbody.innerHTML = rates.map((rate) => {
            const platform = normalizeText(rate?.platform) || 'Unspecified';
            const category = normalizeText(rate?.category) || 'Uncategorized';
            const serviceId = normalizeText(rate?.serviceId) || 'unknown-service';
            const lowestPrice = getLowestVariantPrice(rate?.variants);

            return `
                <tr>
                    <td><strong>${escapeHtml(platform)}</strong></td>
                    <td><strong>${escapeHtml(category)}</strong><div class="smm-muted" style="margin-top:6px;"><code>${escapeHtml(serviceId)}</code></div></td>
                    <td>${buildDetailsCell(rate)}</td>
                    <td><span class="smm-price">${lowestPrice != null ? `₹${lowestPrice}` : '—'}</span></td>
                    <td><span class="smm-muted">${escapeHtml(formatUpdatedAt(rate?.updatedAt))}</span></td>
                    <td>
                        <div class="smm-actions">
                            <button type="button" class="smm-action-btn smm-action-edit" data-service-id="${escapeHtml(serviceId)}" onclick="window.openSmmServiceModal('${escapeHtml(serviceId)}')">Edit</button>
                            <button type="button" class="smm-action-btn smm-action-delete" data-service-id="${escapeHtml(serviceId)}" onclick="window.deleteSmmService('${escapeHtml(serviceId)}')">Delete</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    async function fetchAdminSmmRates() {
        const tbody = document.getElementById('smmRatesTable');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="6" style="padding:28px;text-align:center;color:#64748b;">Loading SMM services...</td></tr>';
        }

        try {
            const res = await fetch('/api/smm/rates', { credentials: 'include' });
            const data = await res.json();
            if (!data.success) {
                throw new Error(data.error || 'Failed to load SMM services.');
            }

            state.allSmmServices = Array.isArray(data.rates) ? data.rates : [];
            state.rates = [...state.allSmmServices];
            renderPlatformFilters();
            renderRatesTable(getFilteredRates());
        } catch (error) {
            const filters = document.getElementById('platformFilters');
            if (filters) {
                filters.innerHTML = '';
            }
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="6" style="padding:28px;text-align:center;color:#b91c1c;">${escapeHtml(error.message || 'Failed to load SMM services.')}</td></tr>`;
            }
        }
    }

    async function renderManagePlatformsList() {
        const tbody = document.getElementById('managePlatformsTableBody');
        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="3" style="color:#64748b;">Loading platforms...</td></tr>';

        try {
            const res = await fetch('/api/platforms', { credentials: 'include' });
            const data = await res.json();
            if (!data.success) {
                throw new Error(data.error || 'Failed to load platforms.');
            }

            const platforms = Array.isArray(data.platforms) ? data.platforms : [];
            if (!platforms.length) {
                tbody.innerHTML = '<tr><td colspan="3" style="color:#64748b;">No platforms found yet.</td></tr>';
                return;
            }

            tbody.innerHTML = platforms.map((platform) => {
                const logoUrl = normalizeText(platform?.logoUrl) || '/assets/images/default-platform.png';
                const name = normalizeText(platform?.name) || 'Unnamed Platform';
                return `
                    <tr>
                        <td><img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(name)}" style="width:42px;height:42px;object-fit:contain;border-radius:12px;border:1px solid rgba(203,213,225,0.9);background:#fff;" onerror="this.onerror=null;this.src='/assets/images/default-platform.png';"></td>
                        <td><strong>${escapeHtml(name)}</strong></td>
                        <td style="text-align:right;">
                            <div class="smm-actions">
                                <button type="button" class="smm-action-btn smm-action-edit" onclick="window.openPlatformBrandingModal('${escapeHtml(platform?._id || '')}', '${escapeHtml(name)}', '${escapeHtml(logoUrl)}')">Edit</button>
                                <button type="button" class="smm-action-btn smm-action-delete" onclick="window.deletePlatform('${escapeHtml(platform?._id || '')}', '${escapeHtml(name)}')">Delete</button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        } catch (error) {
            tbody.innerHTML = `<tr><td colspan="3" style="color:#b91c1c;">${escapeHtml(error.message || 'Failed to load platforms.')}</td></tr>`;
        }
    }

    function bindModalEvents() {
        if (state.modalBindingsReady) return;
        state.modalBindingsReady = true;

        ['smmServiceModal', 'managePlatformsModal', 'platformBrandingModal', 'customDeleteModal'].forEach((modalId) => {
            const modal = document.getElementById(modalId);
            if (!modal) return;
            modal.addEventListener('click', (event) => {
                if (event.target !== modal) return;
                if (modalId === 'smmServiceModal') window.closeSmmServiceModal();
                if (modalId === 'managePlatformsModal') window.closeManagePlatformsModal();
                if (modalId === 'platformBrandingModal') window.closePlatformBrandingModal();
                if (modalId === 'customDeleteModal') window.cancelSmmServiceDelete();
            });
        });

        document.addEventListener('keydown', (event) => {
            if (event.key !== 'Escape') return;
            window.cancelSmmServiceDelete();
            window.closePlatformBrandingModal();
            window.closeManagePlatformsModal();
            window.closeSmmServiceModal();
        });

        const cancelBtn = document.getElementById('cancelDeleteBtn');
        const confirmBtn = document.getElementById('confirmDeleteBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', window.cancelSmmServiceDelete);
        }
        if (confirmBtn) {
            confirmBtn.addEventListener('click', window.confirmSmmServiceDelete);
        }
    }

    window.mountAdminSmmRatesSection = async function () {
        mountSections(["smm-rates-section"]);
        bindModalEvents();
        state.currentVariants = state.currentVariants.length ? state.currentVariants : [makeEmptyVariant()];
        renderVariants();
        await refreshAdminSmmOptions();
        await fetchAdminSmmRates();
    };

    window.handleSmmPlatformSelectChange = async function () {
        const select = document.getElementById('smmPlatform');
        if (!select) return;

        if (select.value === '__add_new__') {
            toggleAddNewWrap('smmPlatform', 'smmPlatformCustomWrap', true);
            state.categoryOptions = [];
            populateCategorySelect('__add_new__');
            return;
        }

        toggleAddNewWrap('smmPlatform', 'smmPlatformCustomWrap', false);
        await refreshCategoryOptions(select.value);
    };

    window.handleSmmCategorySelectChange = function () {
        const select = document.getElementById('smmCategory');
        if (!select) return;
        toggleAddNewWrap('smmCategory', 'smmCategoryCustomWrap', select.value === '__add_new__');
    };

    window.handleSmmPlatformFilterClick = function (platformName = 'All') {
        state.activePlatformFilter = normalizeText(platformName) || 'All';
        renderPlatformFilters();
        renderRatesTable(getFilteredRates());
    };

    window.toggleSmmVariantDynamicFields = function (index, checked) {
        if (!state.currentVariants[index]) return;
        state.currentVariants[index].hasDynamicInput = Boolean(checked);
        if (!state.currentVariants[index].hasDynamicInput) {
            state.currentVariants[index].inputType = 'none';
            state.currentVariants[index].inputLabel = '';
        } else if (state.currentVariants[index].inputType === 'none') {
            state.currentVariants[index].inputType = 'text';
        }
        renderVariants();
    };

    window.addSmmVariant = function () {
        state.currentVariants.push(makeEmptyVariant());
        renderVariants();
    };

    window.removeSmmVariant = function (index) {
        state.currentVariants.splice(index, 1);
        if (!state.currentVariants.length) {
            state.currentVariants.push(makeEmptyVariant());
        }
        renderVariants();
    };

    window.updateSmmVariant = function (index, field, value) {
        if (!state.currentVariants[index]) return;
        state.currentVariants[index][field] = value;
    };

    window.openSmmServiceModal = async function (serviceId = '') {
        bindModalEvents();
        showServiceError('');

        if (!serviceId) {
            await resetServiceForm();
            setModalOpen('smmServiceModal', true);
            return;
        }

        const service = getServiceById(serviceId);
        if (!service) {
            alert('The selected SMM service could not be found. Please refresh the table and try again.');
            return;
        }

        state.editingServiceId = normalizeText(service.serviceId);
        await refreshAdminSmmOptions(service.platform, service.category);
        fillServiceForm(service);

        const title = document.getElementById('smmServiceModalTitle');
        const saveButton = document.getElementById('smmServiceSaveButton');
        if (title) title.textContent = 'Edit SMM Service';
        if (saveButton) saveButton.textContent = 'Update Service';

        setModalOpen('smmServiceModal', true);
    };

    window.closeSmmServiceModal = function () {
        setModalOpen('smmServiceModal', false);
        showServiceError('');
    };

    window.saveSmmService = async function () {
        showServiceError('');

        const platform = resolvePlatformSelection();
        const category = resolveCategorySelection();
        const description = normalizeText(document.getElementById('smmDescription')?.value);

        if (!platform) {
            showServiceError('Please select or create a platform.');
            return;
        }

        if (!category) {
            showServiceError('Please select or create a category.');
            return;
        }

        const normalizedVariants = state.currentVariants.map((variant) => ({
            name: normalizeText(variant.name),
            country: normalizeText(variant.country),
            speed: normalizeText(variant.speed),
            refill: normalizeText(variant.refill),
            variantId: variant.variantId != null ? Number(variant.variantId) : null,
            hasDynamicInput: variant.hasDynamicInput === true,
            inputType: variant.hasDynamicInput ? (normalizeText(variant.inputType) === 'textarea' ? 'textarea' : 'text') : 'none',
            inputLabel: variant.hasDynamicInput ? normalizeText(variant.inputLabel) : '',
            price: Number(variant.price),
            discountPercent: Number(variant.discountPercent),
            minQty: Number(variant.minQty),
            maxQty: Number(variant.maxQty),
            legacyServiceIds: Array.isArray(variant.legacyServiceIds) ? [...variant.legacyServiceIds] : []
        }));

        const invalidVariant = normalizedVariants.find((variant) => {
            return !variant.name
                || (variant.hasDynamicInput === true && !variant.inputLabel)
                || !Number.isFinite(variant.price)
                || variant.price <= 0
                || !Number.isFinite(variant.discountPercent)
                || variant.discountPercent < 0
                || variant.discountPercent > 100
                || !Number.isFinite(variant.minQty)
                || variant.minQty <= 0
                || !Number.isFinite(variant.maxQty)
                || variant.maxQty < variant.minQty;
        });

        if (invalidVariant) {
            showServiceError('Every variant needs a name, positive price, a discount between 0 and 100, valid min/max quantity values, and a dynamic input label when enabled.');
            return;
        }

        const payload = {
            existingServiceId: state.editingServiceId,
            platform,
            category,
            description,
            variants: normalizedVariants
        };

        try {
            const res = await fetch('/api/admin/smm/rates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (!data.success) {
                throw new Error(data.error || 'Failed to save SMM service.');
            }

            await refreshAdminSmmOptions(platform, category);
            await fetchAdminSmmRates();
            window.closeSmmServiceModal();
        } catch (error) {
            showServiceError(error.message || 'Failed to save SMM service.');
        }
    };

    window.openSmmServiceDeleteModal = function (serviceId) {
        const service = getServiceById(serviceId);
        state.serviceToDeleteId = normalizeText(serviceId);

        const nameEl = document.getElementById('deleteModalServiceName');
        const modal = document.getElementById('customDeleteModal');
        if (nameEl) {
            nameEl.textContent = normalizeText(service?.category) || normalizeText(serviceId) || 'this service';
        }
        if (modal) {
            modal.classList.remove('hidden');
        }
    };

    window.cancelSmmServiceDelete = function () {
        state.serviceToDeleteId = null;
        const modal = document.getElementById('customDeleteModal');
        if (modal) {
            modal.classList.add('hidden');
        }
    };

    window.confirmSmmServiceDelete = async function () {
        const serviceId = normalizeText(state.serviceToDeleteId);
        if (!serviceId) {
            window.cancelSmmServiceDelete();
            return;
        }

        try {
            const res = await fetch(`/api/admin/smm/rates/${encodeURIComponent(serviceId)}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            const data = await res.json();
            if (!data.success) {
                throw new Error(data.error || 'Failed to delete SMM service.');
            }

            await fetchAdminSmmRates();
            window.cancelSmmServiceDelete();
        } catch (error) {
            alert(error.message || 'Failed to delete SMM service.');
        }
    };

    window.deleteSmmService = function (serviceId) {
        window.openSmmServiceDeleteModal(serviceId);
    };

    window.openManagePlatformsModal = async function () {
        bindModalEvents();
        setModalOpen('managePlatformsModal', true);
        await renderManagePlatformsList();
    };

    window.closeManagePlatformsModal = function () {
        setModalOpen('managePlatformsModal', false);
    };

    window.openPlatformBrandingModal = function (platformId = '', name = '', logoUrl = '') {
        state.editingPlatformId = normalizeText(platformId);
        const title = document.getElementById('platformBrandingTitle');
        const nameInput = document.getElementById('platformBrandingName');
        const logoInput = document.getElementById('platformBrandingLogoUrl');
        const preview = document.getElementById('platformBrandingPreview');
        const status = document.getElementById('platformBrandingUploadStatus');

        if (title) title.textContent = state.editingPlatformId ? 'Edit Platform Branding' : 'Add Platform Branding';
        if (nameInput) nameInput.value = normalizeText(name);
        if (logoInput) logoInput.value = normalizeText(logoUrl);
        if (status) status.textContent = '';
        if (preview) {
            preview.innerHTML = normalizeText(logoUrl)
                ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(name || 'Platform Logo')}" style="width:100%;height:100%;object-fit:cover;">`
                : '🌐';
        }

        setModalOpen('platformBrandingModal', true);
    };

    window.closePlatformBrandingModal = function () {
        setModalOpen('platformBrandingModal', false);
        state.editingPlatformId = '';
    };

    window.handlePlatformLogoUpload = async function (event) {
        const file = event.target?.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            alert('Platform logos must be under 5 MB.');
            return;
        }

        const status = document.getElementById('platformBrandingUploadStatus');
        const preview = document.getElementById('platformBrandingPreview');
        const urlInput = document.getElementById('platformBrandingLogoUrl');
        if (status) status.textContent = 'Uploading...';

        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch('/api/chat/upload?cloudinary=true', {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });
            const data = await res.json();
            if (!data.success || !data.fileUrl) {
                throw new Error(data.message || 'Upload failed.');
            }

            if (urlInput) urlInput.value = data.fileUrl;
            if (status) status.textContent = 'Uploaded';
            if (preview) {
                preview.innerHTML = `<img src="${escapeHtml(data.fileUrl)}" alt="Platform Logo" style="width:100%;height:100%;object-fit:cover;">`;
            }
        } catch (error) {
            if (status) status.textContent = 'Upload failed';
            alert(error.message || 'Platform logo upload failed.');
        }
    };

    window.submitPlatformBranding = async function () {
        const name = normalizeText(document.getElementById('platformBrandingName')?.value);
        const logoUrl = normalizeText(document.getElementById('platformBrandingLogoUrl')?.value) || '/assets/images/default-platform.png';

        if (!name) {
            alert('Please enter a platform name.');
            return;
        }

        try {
            const url = state.editingPlatformId ? `/api/platforms/${encodeURIComponent(state.editingPlatformId)}` : '/api/platforms';
            const method = state.editingPlatformId ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ name, logoUrl })
            });
            const data = await res.json();
            if (!data.success) {
                throw new Error(data.error || 'Failed to save platform branding.');
            }

            const storedLogos = JSON.parse(localStorage.getItem('custom_platform_logos') || '{}');
            storedLogos[name.toLowerCase()] = logoUrl;
            localStorage.setItem('custom_platform_logos', JSON.stringify(storedLogos));

            await renderManagePlatformsList();
            await refreshAdminSmmOptions(resolvePlatformSelection(name), resolveCategorySelection());
            window.closePlatformBrandingModal();
        } catch (error) {
            alert(error.message || 'Failed to save platform branding.');
        }
    };

    window.deletePlatform = async function (platformId, name) {
        if (!confirm(`Delete platform "${name}"? Existing SMM services will keep the platform name but lose this branding entry.`)) {
            return;
        }

        try {
            const res = await fetch(`/api/platforms/${encodeURIComponent(platformId)}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            const data = await res.json();
            if (!data.success) {
                throw new Error(data.error || 'Failed to delete platform.');
            }

            const storedLogos = JSON.parse(localStorage.getItem('custom_platform_logos') || '{}');
            delete storedLogos[normalizeText(name).toLowerCase()];
            localStorage.setItem('custom_platform_logos', JSON.stringify(storedLogos));

            await renderManagePlatformsList();
            await refreshAdminSmmOptions();
        } catch (error) {
            alert(error.message || 'Failed to delete platform.');
        }
    };

    window.fetchAdminSmmRates = fetchAdminSmmRates;
    window.editSmmRate = window.openSmmServiceModal;
})();
