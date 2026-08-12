# Pave Root Schema Reference

Complete reference of all root fields, inputs, and types in the JobTread Pave
API. Use this to discover available operations without making an API call.
The schema is also introspectable live via `{ "schema": { "$": { "path": "root" } } }`.

Path
schema.root object = {}

This is where all queries start.
Input
grantKey nullable string
The grant key to use to authorize this request.

notify boolean = true
Set to `false` to suppress notifications for this request.

timeZone nullable timeZone
Set the IANA time zone to use when handling time-zone-aware data.

viaUserId nullable jobtreadId
Restrict results to a specific user scope.

Object
account({ id }) nullable account
An account is a customer or vendor.

can({ action, id }) boolean

cancelWorkflowRun({ id }) root

closeNegativePayable({ id, description, paidAt, type }) root

comment({ id }) nullable comment

commentFile({ id }) nullable commentFile

contact({ id }) nullable contact

copyTaskTemplateToTarget({ grantAccess, targetId, targetType, notify, startDate, startTime, taskTemplateId }) root

costCode({ id }) nullable costCode

costGroup({ id }) nullable costGroup

costItem({ id }) nullable costItem

costType({ id }) nullable costType

countryCodes array of countryCode

createAccount({ archive, customFieldValues, isTaxable, name, notify, organizationId, qbdIntegrationSalesTaxCodeId, qbdIntegrationSalesTaxItemId, suffixIfNecessary, type }) root

createAce({ assignee, notify, targetId, targetType }) root

createComment({ assignees, files, isPinned, isReply, isVisibleToAll, isVisibleToCustomerRoles, isVisibleToInternalRoles, isVisibleToVendorRoles, message, name, parentCommentId, targetId, targetType }) root

createContact({ accountId, customFieldValues, name, title }) root

createCostCodeMapping({ name, costCodeId }) root

createCostCode({ name, number, organizationId, parentCostCodeId, qbdIntegrationItemId }) root

createCostGroup({ description, files, isSelected, isSimpleSelection, lineItems, maxSelectionsAllowed, minSelectionsRequired, name, quantity, quantityFormula, showChildCosts, showChildDeltas, showChildren, showDescription, unitId, documentId, jobId, organizationId, parentCostGroupId, positionAfter }) root

createCostItem({ allowanceType, costCodeId, costTypeId, customFieldValues, description, files, globalId, hasFinalActualCost, isEditable, isSelected, isSpecification, isTaxable, jobArea, jobCostItemId, name, organizationCostItemId, quantity, quantityFormula, requireSpecificationApproval, showDescription, showQuantity, sourceCostItemId, unitCost, unitCostFormula, unitId, unitPrice, unitPriceFormula, costGroupId, documentId, jobId, organizationId, positionAfter }) root
Create a catalog cost item with an organizationId, a job budget cost item with a jobId, a document costItem with a documentId or an item in a group in any of those contexts with a costGroupId.

createCostTypeMapping({ name, costTypeId }) root

createCostType({ isTaxable, isTimeTrackable, margin, name, organizationId }) root

createCustomFieldMapping({ name, customFieldId, targetType }) root

createCustomField({ defaultValue, maxValuesAllowed, minValuesRequired, name, options, organizationId, positionAfterCustomFieldId, showOnSpecifications, targetType, type }) root

createdAccount nullable account

createdAce nullable ace

createDailyLog({ assignees, customFieldValues, date, files, jobId, notes, notify }) root

createDashboard({ name, organizationId, tiles, type, visibleToRoleIds }) root

createDataView({ name, organizationId, type, options, positionAfterDataViewId, fields, userId }) root

createdComment nullable comment

createdContact nullable contact

createdCostCode nullable costCode

createdCostGroup nullable costGroup

createdCostItem nullable costItem

createdCostType nullable costType

createdCustomField nullable customField

createdCustomNotificationType nullable customNotificationType

createdDailyLog nullable dailyLog

createdDashboard nullable dashboard

createdDataView nullable dataView

createdDocument nullable document

createdDocumentPayment nullable documentPayment

createdDocumentRecipient nullable documentRecipient

createdDocumentTemplate nullable documentTemplate

createdEphemeralEvent nullable object

createdEvent nullable event

createdFile nullable file

createdFileTag nullable fileTag

createdForm nullable form

createdFormSubmission nullable formSubmission

createdJob nullable job

createdLocation nullable location

createdMembership nullable membership

createdNotification nullable notification

createdNotificationSubscription nullable notificationSubscription

createDocument({ accountId, allowanceCostItemId, allowPartialPayments, coverPageTitle, coverPagePhoto, coverPageSubtitle, coverPageTemplate, lineItems, description, descriptionPdf, dueDate, dueDays, emailMessage, externalId, files, footer, footerPdf, fromAddress, fromEmailAddress, fromName, fromOrganizationName, fromPhoneNumber, groupsStartCollapsed, includeInBudget, isPaymentApplication, isSimpleSelection, issueDate, jobArea, jobId, jobLocationAddress, jobLocationName, name, nonRecoverableTaxName, nonRecoverableTax, paymentMethods, profitBreakdown, qboAccountId, qboClassId, qboDocumentType, qboIsBillable, qboTaxCodeId, qboIsIgnored, references, requireSignature, scheduledDocuments, showChildCosts, showCostItemFiles, showFinancing, showLinesAtDepth, showScheduledDocuments, showProfit, showProgress, showQboInvoiceLink, showQuantity, showTrussInvoiceLink, signatureDisclaimer, subject, taskId, tax, taxName, taxRate, toAddress, toEmailAddress, toName, toOrganizationName, toPhoneNumber, type }) root

createDocumentPayment({ amount, documentId, isLinkedToQbo, paymentId }) root

createDocumentRecipient({ assignee, documentId, requireSignature }) root

createDocumentReference({ documentId, reference }) root

createDocumentTemplate({ allowPartialPayments, coverPageTitle, coverPagePhoto, coverPageSubtitle, coverPageTemplate, description, descriptionPdf, dueDays, emailMessage, fileIds, footer, footerPdf, fromAddress, fromEmailAddress, fromName, fromOrganizationName, fromPhoneNumber, groupsStartCollapsed, includeInBudget, name, nonRecoverableTaxName, organizationId, profitBreakdown, requireSignature, scheduledDocuments, showChildCosts, showCostItemFiles, showFinancing, showLinesAtDepth, showScheduledDocuments, showProfit, showProgress, showQuantity, signatureDisclaimer, taxName, templateName, type }) root

createdOrganizationConnection nullable organizationConnection

createdPayment nullable payment

createdRole nullable role

createdPlanTask nullable planTask

createdTask nullable task

createdTaskTemplate nullable taskTemplate

createdTaskType nullable taskType

createdTimeEntry nullable timeEntry

createdUnit nullable unit

createdUploadRequest nullable uploadRequest

createdUser nullable user

createdWebForm nullable webForm

createdWebhook nullable webhook

createdWorkflow nullable workflow

createdWorkflowRun nullable workflowRun

createFile({ annotatedUploadRequestId, copyFromFileId, copyFromFile, description, fileTagIds, folder, name, targetId, targetType, uploadRequestId }) root

createFileTag({ name, description, color, organizationId }) root

createForm({ description, fields, name, organizationId, reviewerRoleIds, submitterRoleIds, targetType }) root

createFormSubmission(one of filled or request) root

createJob({ areas, closedOn, companycamId, copyCostsFromJobId, copyTasksFromJobId, coverPhoto, customFieldValues, description, lineItems, locationId, name, number, parameters, priceType, qbdId, qboClassId, qboId, defaultRetainagePercentage, scheduleIsPublished, specificationsDescription, specificationsFooter, useSimpleSelections }) root
A location is required to create a job. A customer is required to create a location. To create a new job for a new customer, create the customer, then location, then the job. Budget line items can be set with the `lineItems` input.

createLocation({ accountId, address, contactId, customFieldValues, customTaxRate, name, parseAddress, qboTaxCodeId }) root

createPayment({ accountId, amount, attemptAutoMatch, description, externalId, organizationId, paidAt, source, type }) root

createPlan({ fileId, jobId, name, page, scale }) root

createPlanTask({ planId, taskId, x, y }) root

createRole({ defaultAccountTaskDataViewId, defaultAccountToDoDataViewId, defaultCostItemDataViewId, defaultCustomerDataViewId, defaultDocumentDataViewId, defaultEventDataViewId, defaultIsVisibleToCustomerRoles, defaultIsVisibleToVendorRoles, defaultJobBudgetDataViewId, defaultJobDataViewId, defaultJobTaskDataViewId, defaultJobToDoDataViewId, defaultLocationDataViewId, defaultOrganizationTaskDataViewId, defaultOrganizationToDoDataViewId, defaultPaymentDataViewId, defaultVendorDataViewId, name, organizationId, permissions, type, visibleFolders }) root

createSelectionAssignment({ assignee, isDocumentRecipient, jobId, requireSignature }) root

createTask({ assignedMembershipIds, assignees, dependentTasks, dependsOnTasks, description, endDate, endTime, files, isGroup, isToDo, name, notify, parentTaskId, positionAfterTaskId, progress, startDate, startTime, subtasks, baselineEndDate, baselineEndTime, targetId, baselineStartDate, baselineStartTime, recurrenceRule, targetType, taskTypeId }) root

createTasksFromBudget({ jobId }) root

createTaskTemplate({ name, organizationId, copyTasksFromJobId, copyFrom, isToDo }) root

createTaskTypeMapping({ name, taskTypeId }) root

createTaskType({ name, color, organizationId }) root

createTimeEntry({ costItemId, endCoordinates, endedAt, isApproved, jobId, notes, organizationId, startCoordinates, startedAt, type, userId }) root

createUnitMapping({ name, unitId }) root

createUnit({ name, organizationId }) root

createUploadRequest({ annotations, captchaToken, organizationId, size, type, url, webFormKey }) root
Initiate a file upload to JobTread. Use the resulting `createdUploadRequest`.`url`/`method`/`headers` from this call to upload a file and then attach the upload to a JobTread resource with `createFile`. The other option is to provide the `url` to source the uploadRequest if the file is publicly available on the internet.

createWebForm(one of createCustomer or createVendor) root

createWebhook({ eventTypes, organizationId, url }) root

createWorkflow({ organizationId, actions, customTriggerFields, isActive, name, triggerInput, triggerTypeId }) root

createWorkflowRun({ startAt, workflowId, values }) root

currencyCodes array of currencyCode

currentGrant nullable grant
The `Grant` used to authenticate the request

customField({ id }) nullable customField

dailyLog({ id }) nullable dailyLog

dashboard({ id }) nullable dashboard

dataView({ id }) nullable dataView

deleteAccount({ id }) root

deleteAce({ id }) root

deleteComment({ id, preserveChildren }) root

deleteConferenceEventAttendee({ id }) root

deleteContact({ id }) root

deleteCostCodeMapping({ name, costCodeId }) root

deleteCostCode({ id, mergeWithCostCodeId }) root

deleteCostGroup({ id }) root

deleteCostItem({ id }) root

deleteCostTypeMapping({ name, costTypeId }) root

deleteCostType({ id, mergeWithCostTypeId }) root

deleteCustomFieldMapping({ name, customFieldId, targetType }) root

deleteCustomField({ id }) root

deleteDailyLog({ id }) root

deleteDashboard({ id }) root

deleteDataView({ id }) root

deleteDocument({ id }) root

deleteDocumentPayment({ id }) root

deleteDocumentRecipient({ deleteAce, id }) root

deleteDocumentReference({ documentId, reference }) root

deleteDocumentTemplate({ id }) root

deleteFile({ id }) root

deleteFileTag({ id }) root

deleteForm({ id }) root

deleteFormSubmission({ id }) root

deleteJob({ id }) root

deleteJobArea({ jobArea, jobId, replacementJobArea }) root

deleteLocation({ id }) root

deletePayment({ id }) root

deletePlan({ id }) root

deletePlanTask({ id }) root

deleteRole({ id }) root

deleteSelectionAssignment({ id }) root

deleteTask({ deleteRecurringTasks, id }) root

deleteTaskTemplate({ id }) root

deleteTaskTypeMapping({ name, taskTypeId }) root

deleteTaskType({ id }) root

deleteTimeEntry({ id }) root

deleteUnitMapping({ name, unitId }) root

deleteUnit({ id, mergeWithUnitId }) root

deleteWebForm({ id }) root

deleteWebhook({ id }) root

deleteWorkflow({ id }) root

tutorial({ id }) nullable string({"maxLength":null})
Retrieve a specific help doc by ID

tutorials({ search }) array of object
Search help tutorials

document({ id }) nullable document

documentPayment({ id }) nullable documentPayment

documentRecipient({ id }) nullable documentRecipient

documentTemplate({ id }) nullable documentTemplate

event({ id }) nullable event

eventTypes array of eventType
The possible `eventType` values

file({ id }) nullable file

fileTag({ id }) nullable fileTag

form({ id }) nullable form
Retrieve a single form by its id.

formSubmission({ id }) nullable formSubmission
Retrieve a single form submission by its id.

grant({ id }) nullable grant

job({ id }) nullable job
Retrieve a single job by its id.

languageCodes array of languageCode

lineItemFile({ id }) nullable lineItemFile

location({ id }) nullable location

markCommentAsUnread({ id }) root

membership({ id }) nullable membership

notifyTaskAssignees({ jobId, membershipIds }) root

organization(one of id) nullable organization
Retrieve a single organization by its id. Organization can be subqueried for other records, like accounts, locations, jobs, documents, etc...

payment({ id }) nullable payment

pdf(one of budget, dailyLogs, document, formSubmission, selections, specifications or tasks = {}) nullable uploadRequest

plan({ id }) nullable plan
Retrieve a single plan by its id.

renameFolder({ jobId, newName, oldName }) root

rerunWorkflowRun({ id }) root

role({ id }) nullable role

sendAceNotification({ id }) root

sendDocument({ documentRecipientId, emailMessage }) root

signQuery({ query }) string({"maxLength":null})
Sign the specified query with the current grant, returning a token that can be passed to execute that query with that grant at a later time.

slackIntegration({ id }) nullable slackIntegration

submitWebForm({ captchaToken, data, key }) root

task({ id }) nullable task

taskAssignment({ id }) nullable taskAssignment

taskTemplate({ id }) nullable taskTemplate

taskType({ id }) nullable taskType

timeEntry({ id }) nullable timeEntry

unit({ id }) nullable unit

updateAccount({ accountStatementDescriptors, archive, customFieldValues, id, isTaxable, name, notify, primaryContactId, primaryLocationId, qbdIntegrationSalesTaxCodeId, qbdIntegrationSalesTaxItemId, qboId }) root

updateComment({ id, files, isPinned, isVisibleToAll, isVisibleToCustomerRoles, isVisibleToInternalRoles, isVisibleToVendorRoles, message, name }) root

updateCommentFile({ annotatedUploadRequestId, id, name }) root

updateContact({ customFieldValues, id, name, title }) root

updateCostCode({ id, isActive, name, number, parentCostCodeId, qbdIntegrationItemId, qboId }) root

updateCostGroup({ description, files, id, isSelected, lineItems, maxSelectionsAllowed, minSelectionsRequired, name, quantity, quantityFormula, showChildCosts, showChildDeltas, showChildren, showDescription, unitId, parentCostGroupId, positionAfter }) root

updateCostItem({ allowanceType, costCodeId, costTypeId, customFieldValues, description, files, globalId, hasFinalActualCost, id, isEditable, isSelected, isSpecification, isTaxable, jobArea, jobCostItemId, name, organizationCostItemId, quantity, quantityFormula, requireSpecificationApproval, showDescription, showQuantity, sourceCostItemId, unitCost, unitCostFormula, unitId, unitPrice, unitPriceFormula, costGroupId, positionAfter }) root

updateCostType({ id, isActive, isTaxable, isTimeTrackable, margin, name }) root

updateCustomField({ defaultValue, id, maxValuesAllowed, minValuesRequired, name, options, positionAfterCustomFieldId, showOnSpecifications }) root

updateDailyLog({ customFieldValues, date, id, jobId, notes }) root

updateDashboard({ id, name, tiles, visibleToRoleIds }) root

updateDataView({ id, name, options, positionAfterDataViewId, fields, userId }) root

updateDocument({ accountId, allowanceCostItemId, allowPartialPayments, closeMessage, coverPageTitle, coverPagePhoto, coverPageSubtitle, coverPageTemplate, lineItems, description, descriptionPdf, dueDate, dueDays, emailMessage, externalId, footer, footerPdf, fromAddress, fromEmailAddress, fromName, fromOrganizationName, fromPhoneNumber, groupsStartCollapsed, id, includeInBudget, issueDate, jobArea, jobLocationAddress, jobLocationName, name, nonRecoverableTax, nonRecoverableTaxName, notify, paymentMethods, profitBreakdown, qboAccountId, qboClassId, qboDocumentType, qboIsBillable, qboIsIgnored, qboTaxCodeId, requireSignature, scheduledDocuments, showChildCosts, showCostItemFiles, showFinancing, showLinesAtDepth, showScheduledDocuments, showProfit, showProgress, showQboInvoiceLink, showQuantity, showTrussInvoiceLink, signatureDisclaimer, signaturePath, status, subject, taskId, tax, taxName, taxRate, toAddress, toEmailAddress, toName, toOrganizationName, toPhoneNumber }) root

updateDocumentPayment({ amount, id }) root

updateDocumentRecipient({ id, requireSignature, signatoryName, signaturePath, footerSignaturePaths }) root

updateDocumentTemplate({ id, allowPartialPayments, coverPageTitle, coverPagePhoto, coverPageSubtitle, coverPageTemplate, description, descriptionPdf, dueDays, emailMessage, fileIds, footer, footerPdf, fromAddress, fromEmailAddress, fromName, fromOrganizationName, fromPhoneNumber, groupsStartCollapsed, includeInBudget, name, nonRecoverableTaxName, profitBreakdown, requireSignature, scheduledDocuments, showChildCosts, showCostItemFiles, showFinancing, showLinesAtDepth, showScheduledDocuments, showProfit, showProgress, showQuantity, signatureDisclaimer, taxName, templateName }) root

updateFile({ annotatedUploadRequestId, id, fileTagIds, folder, name, description }) root

updateFileTag({ id, name, description, color }) root

updateFormSubmission({ id, isSubmitted, values }) root

updateForm({ description, fields, id, isActive, name, reviewerRoleIds, submitterRoleIds, targetType }) root

updateJobArea({ jobId, nextJobArea, previousJobArea }) root

updateJob({ areas, closedOn, companycamId, coverPhoto, customFieldValues, description, endTaskId, folders, hoverJobId, id, lineItems, name, number, parameters, priceType, qbdId, qboClassId, qboId, defaultRetainagePercentage, retainageCostItemId, scheduleIsPublished, specificationsDescription, specificationsFooter, startTaskId, useSimpleSelections }) root
Budget line items can be set with the `lineItems` input.

updateJobContact({ aceId, isVisibleToCustomerRoles, isVisibleToVendorRoles }) root

updateLineItemFile({ annotatedUploadRequestId, id, name }) root

updateLocation({ address, contactId, customFieldValues, customTaxRate, id, name, qboTaxCodeId }) root

updateMembership({ captchaToken, defaultAccountTaskDataViewId, defaultAccountToDoDataViewId, defaultCostItemDataViewId, defaultCustomerDataViewId, defaultDocumentDataViewId, defaultEventDataViewId, defaultJobBudgetDataViewId, defaultJobDashboardId, defaultJobDataViewId, defaultJobTaskDataViewId, defaultJobToDoDataViewId, defaultLocationDataViewId, defaultOrganizationDashboardId, defaultOrganizationTaskDataViewId, defaultOrganizationToDoDataViewId, defaultPaymentDataViewId, defaultVendorDataViewId, gustoEmployeeId, id, isInternal, qbdIntegrationEmployeeId, qboEmployeeId, roleId, syncTimeEntriesSince, timeEntryTypes, useRoleNotificationSubscriptions }) root

updatePayment({ accountId, amount, description, externalId, id, paidAt, source }) root

updatePlan({ fileId, id, name, page, scale, annotations }) root

updatePlanTask({ id, x, y }) root

updateRole({ defaultAccountTaskDataViewId, defaultAccountToDoDataViewId, defaultCostItemDataViewId, defaultCustomerDataViewId, defaultDocumentDataViewId, defaultEventDataViewId, defaultIsVisibleToCustomerRoles, defaultIsVisibleToVendorRoles, defaultJobBudgetDataViewId, defaultJobDataViewId, defaultJobTaskDataViewId, defaultJobToDoDataViewId, defaultLocationDataViewId, defaultOrganizationDashboardId, defaultOrganizationTaskDataViewId, defaultOrganizationToDoDataViewId, defaultPaymentDataViewId, defaultVendorDataViewId, name, id, permissions, visibleFolders }) root

updateSelectionAssignment({ id, isDocumentRecipient, requireSignature }) root

updateTask({ assignedMembershipIds, assignees, dependentTasks, dependsOnTasks, description, endDate, endTime, id, name, notify, parentTaskId, positionAfterTaskId, progress, startDate, startTime, subtasks, baselineEndDate, baselineEndTime, baselineStartDate, baselineStartTime, recurrenceRule, taskTypeId, updateDependentTasks, updateRecurringTasks }) root

updateTaskAssignment({ id, isAccepted }) root

updateTaskTemplate({ endTaskId, id, name, startTaskId }) root

updateTaskType({ id, name, color }) root

updateTimeEntry({ applyOvertime, costItemId, endCoordinates, endedAt, endNow, id, isApproved, jobId, notes, startCoordinates, startedAt, type }) root

updateUnit({ id, isActive, name }) root

updateUploadRequest({ annotatedUploadRequestId, id }) root

updateWebForm({ assignedMembershipIds, fields, id, name, options, successMessage, successUrl }) root

updateWorkflow({ id, actions, customTriggerFields, isActive, name, triggerInput, triggerTypeId }) root

uploadRequest({ id }) nullable uploadRequest

user({ id }) nullable user

version string
The current API version

webForm({ id, key }) nullable webForm

webFormFields({ organizationId, type }) array of object

webhook({ id }) nullable webhook

whoCan({ action, id, page, with, expressions, where, size, group, sortBy }) object

workflow({ id }) nullable workflow

workflowRun({ id }) nullable workflowRun
