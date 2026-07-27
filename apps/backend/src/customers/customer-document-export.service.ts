import type { Readable } from 'stream';

import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ZipArchive, type ArchiverError } from 'archiver';
import type { Request, Response } from 'express';
import PDFDocument from 'pdfkit';
import { Repository } from 'typeorm';

import { formatInr } from '../common/utils/currency.util';
import { AuditLogEntity, DocumentCategory, UserEntity, UserRole } from '../database/entities';
import { DocumentRepository } from '../documents/document.repository';
import { LoanApplicationRepository } from '../loan-applications/loan-application.repository';
import { StorageService } from '../storage/storage.service';
import { UserRepository } from '../users/user.repository';

/** Real `DocumentCategory` values only — no `Address` bucket exists in the catalog, so none is invented here. */
const CATEGORY_FOLDER_LABEL: Record<DocumentCategory, string> = {
  [DocumentCategory.IDENTITY]: 'Identity',
  [DocumentCategory.INCOME]: 'Income',
  [DocumentCategory.EMPLOYMENT]: 'Employment',
  [DocumentCategory.BALANCE_TRANSFER]: 'Balance Transfer',
  [DocumentCategory.LOAN_SPECIFIC]: 'Loan Specific',
  [DocumentCategory.PHOTO]: 'Photo',
  [DocumentCategory.OTHER]: 'Other',
};

function sanitizeForZipEntry(value: string): string {
  return value.replace(/["\r\n/\\]/g, '_');
}

/**
 * "Download All Documents" — the mandatory one-click ZIP/PDF export.
 * Streams a ZIP (real documents, grouped by their real `DocumentCategory`
 * — not a fabricated folder set) plus a generated `Case_Summary.pdf`,
 * with zero server-side buffering of file contents: every document is
 * piped straight from `StorageService.getReadStream` into the archive,
 * and the archive is piped straight into the HTTP response. Nothing is
 * duplicated in storage; nothing is written to a temp file.
 */
@Injectable()
export class CustomerDocumentExportService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly loanApplicationRepository: LoanApplicationRepository,
    private readonly documentRepository: DocumentRepository,
    private readonly storageService: StorageService,
    @InjectRepository(AuditLogEntity)
    private readonly auditLogRepository: Repository<AuditLogEntity>,
  ) {}

  async streamDownloadAll(
    customerId: string,
    actor: UserEntity,
    req: Request,
    res: Response,
  ): Promise<void> {
    const customer = await this.userRepository.findOneById(customerId);
    if (!customer || customer.role !== UserRole.CUSTOMER) {
      throw new NotFoundException('Customer not found.');
    }

    if (actor.role === UserRole.EMPLOYEE) {
      const hasAccess = await this.loanApplicationRepository.existsAssignedToEmployeeAndApplicant(
        actor.id,
        customerId,
      );
      if (!hasAccess) {
        throw new ForbiddenException('You do not have access to this customer.');
      }
    }

    const [applications, documents] = await Promise.all([
      this.loanApplicationRepository.findAllByApplicantWithRelations(customerId),
      this.documentRepository.findAllByOwnerWithDetails(customerId),
    ]);

    // Documents aren't guaranteed to belong to exactly one application
    // (a customer can have documents on file before ever submitting
    // one) — the ZIP is customer-scoped, not application-scoped, so the
    // most recently submitted application is used for the filename and
    // the summary's case-level facts. Falls back to a customer-id-based
    // name for the (rare) customer with documents but no application.
    const primaryApplication = applications[0];
    const caseNumber = primaryApplication?.caseNumber ?? `CUSTOMER-${customerId.slice(0, 8)}`;
    const safeZipName = sanitizeForZipEntry(`LM-${caseNumber}-Documents.zip`);

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${safeZipName}"`);

    const archive = new ZipArchive({ zlib: { level: 9 } });
    archive.on('error', (err: ArchiverError) => {
      throw err;
    });
    archive.pipe(res);

    for (const document of documents) {
      const { stream } = await this.storageService.getReadStream(document.storagePath);
      const folder = document.documentTypeRef
        ? CATEGORY_FOLDER_LABEL[document.documentTypeRef.category]
        : CATEGORY_FOLDER_LABEL[DocumentCategory.OTHER];
      const label = document.documentTypeRef?.label ?? 'Document';
      const entryName = sanitizeForZipEntry(`${label} - ${document.originalFileName}`);
      archive.append(stream as unknown as Readable, { name: `${folder}/${entryName}` });
    }

    const summaryPdf = await buildCaseSummaryPdf({
      caseNumber,
      customerName: customer.fullName ?? 'Unknown',
      applicationNumbers: applications.map((application) => application.caseNumber),
      loanAmount: primaryApplication ? formatInr(primaryApplication.requestedAmount) : null,
      assignedEmployeeName: primaryApplication?.assignedTo?.fullName ?? null,
      status: primaryApplication?.status ?? null,
      documents: documents.map((document) => ({
        name: document.originalFileName,
        typeLabel: document.documentTypeRef?.label ?? 'Document',
        uploadedAt: document.uploadedAt,
        verificationStatus: document.verificationStatus,
      })),
    });
    archive.append(summaryPdf, { name: 'Case_Summary.pdf' });

    await archive.finalize();

    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        actorId: actor.id,
        action: 'documents_zip_downloaded',
        entityName: 'users',
        entityId: customerId,
        metadata: {
          caseNumber,
          downloadedByRole: actor.role,
          ipAddress: req.ip ?? null,
        },
      }),
    );
  }
}

interface CaseSummaryData {
  caseNumber: string;
  customerName: string;
  applicationNumbers: string[];
  loanAmount: string | null;
  assignedEmployeeName: string | null;
  status: string | null;
  documents: {
    name: string;
    typeLabel: string;
    uploadedAt: Date;
    verificationStatus: string;
  }[];
}

/** Generates `Case_Summary.pdf` in-memory — no temp file, returned as a Buffer for `archiver.append`. */
function buildCaseSummaryPdf(data: CaseSummaryData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(18).text('Case Summary', { align: 'center' });
    doc.moveDown();

    doc.fontSize(11);
    doc.text(`Case Number: ${data.caseNumber}`);
    doc.text(`Customer Name: ${data.customerName}`);
    doc.text(`Application Number(s): ${data.applicationNumbers.join(', ') || '—'}`);
    doc.text(`Loan Amount: ${data.loanAmount ?? '—'}`);
    doc.text(`Assigned Employee: ${data.assignedEmployeeName ?? 'Unassigned'}`);
    doc.text(`Application Status: ${data.status ?? '—'}`);
    doc.text(`Generated Date: ${new Date().toLocaleString()}`);
    doc.moveDown();

    doc.fontSize(14).text('Document Inventory', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10);
    if (data.documents.length === 0) {
      doc.text('No documents on file.');
    }
    for (const document of data.documents) {
      doc.text(
        `${document.typeLabel} — ${document.name} — uploaded ${new Date(document.uploadedAt).toLocaleDateString()} — ${document.verificationStatus}`,
      );
    }

    doc.end();
  });
}
