"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@angular/core/testing");
const build_service_1 = require("./build.service");
describe('BuildService', () => {
    beforeEach(() => {
        testing_1.TestBed.configureTestingModule({
            providers: [build_service_1.BuildService]
        });
    });
    it('should be created', testing_1.inject([build_service_1.BuildService], (service) => {
        expect(service).toBeTruthy();
    }));
});
