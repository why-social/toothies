import { Component, ViewChild, ElementRef } from '@angular/core';

@Component({
	selector: 'calendar',
	templateUrl: './calendar.html',
	styleUrl: './calendar.css'
})

export class Calendar {
	@ViewChild('times') times: ElementRef<HTMLElement>;

	public onScroll(event: Event) {
		this.times.nativeElement.style.transform =
			`translateX(${(event.target as HTMLElement).scrollLeft}px)`
	}
};