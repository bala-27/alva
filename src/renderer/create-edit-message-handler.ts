import * as Message from '../message';
import * as Model from '../model';
import { ViewStore } from '../store';
import * as Types from '../types';

export type EditMessageHandler = (message: Message.Message) => void;

export function createEditMessageHandler({
	app,
	store
}: {
	store: ViewStore;
	app: Model.AlvaApp;
}): EditMessageHandler {
	// tslint:disable-next-line:cyclomatic-complexity
	return function editMessageHandler(message: Message.Message): void {
		if (store.getApp().getHasFocusedInput()) {
			return;
		}

		const project = store.getProject();

		switch (message.type) {
			case Message.MessageType.Undo: {
				store.undo();
				break;
			}
			case Message.MessageType.Redo: {
				store.redo();
				break;
			}
			case Message.MessageType.Cut: {
				switch (project.getFocusedItemType()) {
					case Types.ItemType.Element:
						store.removeSelectedElement();
						break;
					case Types.ItemType.Page:
						store.removeSelectedPage();
				}
				break;
			}
			case Message.MessageType.CutElement:
			case Message.MessageType.DeleteElement: {
				store.removeElementById(message.payload);
				break;
			}
			case Message.MessageType.Delete: {
				switch (project.getFocusedItemType()) {
					case Types.ItemType.Element:
						store.removeSelectedElement();
						break;
					case Types.ItemType.Page:
						store.removeSelectedPage();
				}
				break;
			}
			case Message.MessageType.PasteElement: {
				project.startBatch();

				const activePage = store.getActivePage() as Model.Page;

				if (!activePage) {
					return;
				}

				const targetElement = message.payload.targetId
					? store.getElementById(message.payload.targetId)
					: store.getSelectedElement() || activePage.getRoot();

				if (!targetElement) {
					return;
				}

				const contextProject = message.payload.project
					? Model.Project.from(message.payload.project)
					: store.getProject();

				const sourceElement = Model.Element.from(message.payload.element, {
					project: contextProject
				});

				project.endBatch();

				const clonedElement = sourceElement.clone();

				project.importElement(clonedElement);

				switch (message.payload.targetType) {
					case Types.ElementTargetType.Inside:
						if (targetElement.acceptsChildren()) {
							store.insertElementInside({
								element: clonedElement,
								targetElement
							});
						}
						break;
					case Types.ElementTargetType.Auto:
					case Types.ElementTargetType.Below:
						store.insertElementAfter({
							element: clonedElement,
							targetElement
						});
				}

				store.commit();
				project.setSelectedElement(clonedElement);

				break;
			}
			case Message.MessageType.PastePage: {
				project.startBatch();

				const pages = store.getPages();
				const activePage = (store.getActivePage() || pages[pages.length - 1]) as Model.Page;

				const contextProject = message.payload.project
					? Model.Project.from(message.payload.project)
					: store.getProject();

				const sourcePage = Model.Page.from(message.payload.page, { project: contextProject });
				project.endBatch();

				const clonedPage = sourcePage.clone();

				project.importPage(clonedPage);
				store.commit();

				project.movePageAfter({
					page: clonedPage,
					targetPage: activePage
				});

				project.setActivePage(clonedPage);

				break;
			}
			case Message.MessageType.Duplicate: {
				switch (project.getFocusedItemType()) {
					case Types.ItemType.Element:
						store.duplicateSelectedElement();
						break;
					case Types.ItemType.Page:
						store.duplicateActivePage();
				}
				break;
			}
			case Message.MessageType.DuplicateElement: {
				switch (project.getFocusedItemType()) {
					case Types.ItemType.Element:
						store.duplicateElementById(message.payload);
				}
			}
		}
	};
}
