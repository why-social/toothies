import {
  Component,
  ChangeDetectionStrategy,
  inject,
  Inject,
} from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import {
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';

@Component({
  templateUrl: './dialog.html',
  styleUrl: './dialog.css',
  imports: [
    MatButtonModule,
    MatDialogActions,
    MatDialogClose,
    MatDialogTitle,
    MatDialogContent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dialog {
  readonly dialogRef = inject(MatDialogRef<Dialog>);

  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: {
      title: string;
      message: string;
    },
  ) {}

  public cancel() {
    this.dialogRef.close();
  }

  public confirm() {
    this.dialogRef.close('success');
  }
}
