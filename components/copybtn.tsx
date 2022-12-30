import { showToast } from "../libs/toast";

function toggleCopyIcon(element: HTMLElement, timeout: number) {
    // bi-clipboard bi-clipboard-check
    element.classList.remove('bi-clipboard');
    element.classList.add('bi-clipboard-check');
    element.classList.add('text-success');
    setTimeout(() => {
        element.classList.remove('bi-clipboard-check');
        element.classList.remove('text-success');
        element.classList.add('bi-clipboard');
    }, timeout);
}

export function CopyButton({ getContent, className, toast = true, timeout = 3000 }: { getContent?: () => string, className?: string, toast?: boolean, timeout?: number }) {
    return (
        <button type='button' className={`btn btn-ms${className ? ' ' + className : ''}`} data-toggle="tooltip" data-placement="right" title="Copy"
            onClick={(e) => {
                if (getContent) {
                    const content = getContent();
                    const iconEle = e.currentTarget.getElementsByTagName('i')[0];
                    toggleCopyIcon(iconEle, timeout);
                    navigator.clipboard.writeText(content);
                    if (toast) {
                        showToast('Copied', 'success', timeout);
                    }
                }
            }}
        >
            <i className="bi bi-clipboard fs-5"></i>
        </button>
    )
}

