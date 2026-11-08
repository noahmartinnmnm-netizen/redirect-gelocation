/* eslint-disable react/prop-types */
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import popupCss from "./ecePopupPage.css?inline";
import templatesCss from "./ecePopupTemplates.css?inline";
import { EcePopupPreview } from "./EcePopupPreview";
import {
  ECE_POPUP_TEMPLATES,
  defaultPopupDesign,
  previewCountry,
} from "./ecePopupDesigns";

const PREVIEW_COUNTRY = previewCountry("FR");

function noop() {}

export function popupTemplate(templateId) {
  return ECE_POPUP_TEMPLATES.find((template) => template.id === templateId) || null;
}

export function useEcePopupTemplates({ addModalRef, setDraft, disabled }) {
  const navigate = useNavigate();
  const templatesModalRef = useRef(null);
  const modalSwap = useRef("");
  const [openToken, setOpenToken] = useState(0);

  useEffect(() => {
    const addModal = addModalRef.current;
    const templatesModal = templatesModalRef.current;
    if (!addModal || !templatesModal) return undefined;

    // Modals are swapped, not stacked: each opens only after the other has fully closed.
    function afterAddHide() {
      if (modalSwap.current !== "templates") return;
      modalSwap.current = "add";
      templatesModal.showOverlay();
    }
    function afterTemplatesHide() {
      const target = modalSwap.current;
      modalSwap.current = "";
      if (target === "add") {
        addModal.showOverlay();
      } else if (target.startsWith("popup:")) {
        navigate(`/app/popup?template=${encodeURIComponent(target.slice(6))}`);
      }
    }

    addModal.addEventListener("afterhide", afterAddHide);
    templatesModal.addEventListener("afterhide", afterTemplatesHide);
    return () => {
      addModal.removeEventListener("afterhide", afterAddHide);
      templatesModal.removeEventListener("afterhide", afterTemplatesHide);
    };
  }, [addModalRef, navigate]);

  function openTemplates() {
    if (disabled) return;
    modalSwap.current = "templates";
    setOpenToken((token) => token + 1);
    addModalRef.current?.hideOverlay();
  }

  function chooseTemplate(templateId) {
    setDraft((current) => ({ ...current, popupTemplateId: templateId }));
    templatesModalRef.current?.hideOverlay();
  }

  function openPopupEditor(templateId) {
    modalSwap.current = `popup:${templateId}`;
    templatesModalRef.current?.hideOverlay();
  }

  return {
    openTemplates,
    modalProps: {
      modalRef: templatesModalRef,
      openToken,
      onChoose: chooseTemplate,
      onOpenEditor: openPopupEditor,
    },
  };
}

export function EcePopupTemplatesModal({
  modalRef,
  selectedId,
  openToken,
  onChoose,
  onOpenEditor,
}) {
  const [choice, setChoice] = useState(selectedId || ECE_POPUP_TEMPLATES[0].id);

  useEffect(() => {
    setChoice(selectedId || ECE_POPUP_TEMPLATES[0].id);
  }, [openToken, selectedId]);

  function onCardKeyDown(event, id) {
    if (event.target !== event.currentTarget) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setChoice(id);
    }
  }

  return (
    <s-modal
      id="ece-popup-templates-modal"
      ref={modalRef}
      heading="Popup templates"
      size="large"
      accessibilityLabel="Popup templates"
    >
      <div className="ece-popup ece-tpl">
        <style dangerouslySetInnerHTML={{ __html: popupCss + templatesCss }} />
        <p className="ece-tpl__intro">
          Default designs, shown for a visitor from {PREVIEW_COUNTRY.name}. Preview opens the
          design on the Popup page. Use template adds it to this redirect.
        </p>
        <div className="ece-tpl__grid" role="radiogroup" aria-label="Popup templates">
          {ECE_POPUP_TEMPLATES.map((template) => {
            const selected = template.id === choice;
            return (
              <div
                key={template.id}
                id={`ece-tpl-${template.id}`}
                role="radio"
                aria-checked={selected}
                aria-label={`${template.name}, ${template.kindLabel}`}
                tabIndex={0}
                className={`ece-tpl__card${selected ? " is-selected" : ""}`}
                onClick={() => setChoice(template.id)}
                onKeyDown={(event) => onCardKeyDown(event, template.id)}
              >
                <div className="ece-tpl__thumb" aria-hidden="true" inert="">
                  <div className="ece-tpl__thumb-scale">
                    <EcePopupPreview
                      design={defaultPopupDesign(template.id)}
                      device="desktop"
                      country={PREVIEW_COUNTRY}
                      languageCode=""
                      notice={null}
                      onCountryChange={noop}
                      onLanguageChange={noop}
                      onClose={noop}
                      onConfirm={noop}
                      onStay={noop}
                      onReplay={noop}
                    />
                  </div>
                </div>
                <div className="ece-tpl__footer">
                  <span className="ece-tpl__name">{template.name}</span>
                  <button
                    type="button"
                    id={`ece-tpl-open-${template.id}`}
                    className="ece-tpl__preview"
                    onClick={(event) => {
                      event.stopPropagation();
                      setChoice(template.id);
                      onOpenEditor(template.id);
                    }}
                  >
                    Preview
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <s-button
        id="ece-popup-templates-use"
        slot="primary-action"
        variant="primary"
        onClick={() => onChoose(choice)}
      >
        Use template
      </s-button>
      <s-button
        id="ece-popup-templates-cancel"
        slot="secondary-actions"
        variant="secondary"
        commandFor="ece-popup-templates-modal"
        command="--hide"
      >
        Cancel
      </s-button>
    </s-modal>
  );
}

