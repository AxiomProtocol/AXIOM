// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title AxiomAcademyHub
 * @notice Educational platform and learning management system for Axiom Smart City
 * @dev On-chain education with courses, certifications, achievements, and skill tracking
 * 
 * Features:
 * - Course creation and management
 * - Learning modules and lessons
 * - Skill-based certifications (NFT-like)
 * - Achievement tracking and badges
 * - Instructor credentialing
 * - Student progress tracking
 * - Decentralized credentials
 */
contract AxiomAcademyHub is AccessControl, ReentrancyGuard, Pausable {

    // ============================================
    // ROLES
    // ============================================
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant INSTRUCTOR_ROLE = keccak256("INSTRUCTOR_ROLE");
    bytes32 public constant CERTIFIER_ROLE = keccak256("CERTIFIER_ROLE");

    // ============================================
    // CONSTANTS
    // ============================================
    uint256 public constant MAX_COURSES = 10000;
    uint256 public constant MAX_MODULES_PER_COURSE = 50;
    uint256 public constant MAX_LESSONS_PER_MODULE = 100;
    uint256 public constant MAX_ENROLLMENTS_PER_USER = 100;
    uint256 public constant MAX_STUDENTS_PER_COURSE = 10000;      // CRITICAL FIX: Prevent DOS
    uint256 public constant MAX_COURSES_PER_INSTRUCTOR = 100;     // CRITICAL FIX: Prevent DOS
    uint256 public constant MAX_CERTIFICATIONS_PER_STUDENT = 100; // CRITICAL FIX: Prevent DOS
    uint256 public constant MAX_DESCRIPTION_LENGTH = 2000;

    // ============================================
    // STATE VARIABLES
    // ============================================
    uint256 public totalCourses;
    uint256 public totalEnrollments;
    uint256 public totalCertifications;
    uint256 public totalInstructors;

    // ============================================
    // ENUMS
    // ============================================
    
    enum CourseLevel {
        Beginner,
        Intermediate,
        Advanced,
        Expert
    }
    
    enum CourseStatus {
        Draft,
        Active,
        Archived
    }
    
    enum CertificationType {
        Completion,      // Completed the course
        Achievement,     // Passed with distinction
        Skill,           // Verified skill certification
        Professional     // Professional credential
    }
    
    // ============================================
    // STRUCTS
    // ============================================
    
    struct Course {
        uint256 courseId;
        string title;
        string description;
        string imageURI;
        address instructor;
        CourseLevel level;
        CourseStatus status;
        uint256 moduleCount;
        uint256 totalLessons;           // CRITICAL FIX: Cache total lessons to avoid iteration
        uint256 enrollmentCount;
        uint256 completionCount;
        bool requiresVerification;
        uint256 createdAt;
    }
    
    struct Module {
        uint256 moduleId;
        uint256 courseId;
        string title;
        string description;
        uint256 lessonCount;
        uint256 orderIndex;
        bool isRequired;
    }
    
    struct Lesson {
        uint256 lessonId;
        uint256 moduleId;
        string title;
        string contentURI;      // IPFS URI for lesson content
        uint256 orderIndex;
        uint256 estimatedMinutes;
    }
    
    struct Enrollment {
        address student;
        uint256 courseId;
        uint256 enrolledAt;
        uint256 lastAccessedAt;
        uint256 progressPercentage;
        bool isCompleted;
        uint256 completedAt;
    }
    
    struct LessonProgress {
        uint256 lessonId;
        address student;
        bool isCompleted;
        uint256 completedAt;
        uint256 timeSpentMinutes;
    }
    
    struct Certification {
        uint256 certificationId;
        address recipient;
        uint256 courseId;
        CertificationType certificationType;
        string credentialURI;   // IPFS URI for certificate
        address certifier;
        uint256 issuedAt;
        bool isRevoked;
    }
    
    struct Instructor {
        address instructorAddress;
        string name;
        string bio;
        string imageURI;
        uint256 courseCount;
        uint256 studentCount;
        bool isVerified;
        uint256 registeredAt;
    }
    
    // ============================================
    // MAPPINGS
    // ============================================
    
    // Course storage
    mapping(uint256 => Course) private courses;
    mapping(uint256 => Module[]) private courseModules;
    mapping(uint256 => Lesson[]) private moduleLessons;
    
    // CRITICAL FIX: Module and lesson existence tracking for O(1) validation
    mapping(uint256 => bool) private moduleExists;
    mapping(uint256 => bool) private lessonExists;
    
    // Enrollment tracking
    mapping(address => mapping(uint256 => Enrollment)) private enrollments;
    mapping(address => uint256[]) private studentCourses;
    mapping(uint256 => address[]) private courseStudents;
    
    // Progress tracking
    mapping(address => mapping(uint256 => LessonProgress)) private lessonProgress;
    mapping(address => mapping(uint256 => uint256[])) private studentCompletedLessons;
    
    // Certifications
    mapping(uint256 => Certification) private certifications;
    mapping(address => uint256[]) private studentCertifications;
    
    // Instructors
    mapping(address => Instructor) private instructors;
    mapping(address => bool) public isInstructor;
    mapping(address => uint256[]) private instructorCourses;
    
    // ============================================
    // EVENTS
    // ============================================
    
    event CourseCreated(
        uint256 indexed courseId,
        address indexed instructor,
        string title,
        CourseLevel level
    );
    
    event ModuleAdded(
        uint256 indexed courseId,
        uint256 indexed moduleId,
        string title
    );
    
    event LessonAdded(
        uint256 indexed moduleId,
        uint256 indexed lessonId,
        string title
    );
    
    event StudentEnrolled(
        address indexed student,
        uint256 indexed courseId,
        uint256 timestamp
    );
    
    event LessonCompleted(
        address indexed student,
        uint256 indexed lessonId,
        uint256 timestamp
    );
    
    event CourseCompleted(
        address indexed student,
        uint256 indexed courseId,
        uint256 timestamp
    );
    
    event CertificationIssued(
        uint256 indexed certificationId,
        address indexed recipient,
        uint256 indexed courseId,
        CertificationType certificationType
    );
    
    event InstructorRegistered(
        address indexed instructor,
        string name,
        uint256 timestamp
    );
    
    event CertificationRevoked(
        uint256 indexed certificationId,
        address indexed certifier
    );
    
    // ============================================
    // CONSTRUCTOR
    // ============================================
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(CERTIFIER_ROLE, msg.sender);
    }
    
    // ============================================
    // INSTRUCTOR MANAGEMENT
    // ============================================
    
    /**
     * @notice Register as an instructor
     */
    function registerInstructor(
        string calldata name,
        string calldata bio,
        string calldata imageURI
    ) external nonReentrant whenNotPaused {  // CRITICAL FIX: Add pause protection
        require(!isInstructor[msg.sender], "Already instructor");
        require(bytes(name).length > 0 && bytes(name).length <= 100, "Invalid name");
        require(bytes(bio).length <= MAX_DESCRIPTION_LENGTH, "Bio too long");
        
        Instructor storage instructor = instructors[msg.sender];
        instructor.instructorAddress = msg.sender;
        instructor.name = name;
        instructor.bio = bio;
        instructor.imageURI = imageURI;
        instructor.registeredAt = block.timestamp;
        
        isInstructor[msg.sender] = true;
        totalInstructors++;
        
        _grantRole(INSTRUCTOR_ROLE, msg.sender);
        
        emit InstructorRegistered(msg.sender, name, block.timestamp);
    }
    
    /**
     * @notice Verify an instructor (admin only)
     */
    function verifyInstructor(address instructor) external onlyRole(ADMIN_ROLE) {
        require(isInstructor[instructor], "Not an instructor");
        instructors[instructor].isVerified = true;
    }
    
    // ============================================
    // COURSE MANAGEMENT
    // ============================================
    
    /**
     * @notice Create a new course
     */
    function createCourse(
        string calldata title,
        string calldata description,
        string calldata imageURI,
        CourseLevel level,
        bool requiresVerification
    ) external onlyRole(INSTRUCTOR_ROLE) nonReentrant whenNotPaused returns (uint256) {  // CRITICAL FIX: Add pause protection
        require(totalCourses < MAX_COURSES, "Max courses reached");
        require(bytes(title).length > 0 && bytes(title).length <= 200, "Invalid title");
        require(bytes(description).length <= MAX_DESCRIPTION_LENGTH, "Description too long");
        
        // CRITICAL FIX: Enforce max courses per instructor
        require(instructorCourses[msg.sender].length < MAX_COURSES_PER_INSTRUCTOR, "Max instructor courses reached");
        
        totalCourses++;
        uint256 courseId = totalCourses;
        
        Course storage course = courses[courseId];
        course.courseId = courseId;
        course.title = title;
        course.description = description;
        course.imageURI = imageURI;
        course.instructor = msg.sender;
        course.level = level;
        course.status = CourseStatus.Draft;
        course.requiresVerification = requiresVerification;
        course.createdAt = block.timestamp;
        
        instructorCourses[msg.sender].push(courseId);
        instructors[msg.sender].courseCount++;
        
        emit CourseCreated(courseId, msg.sender, title, level);
        
        return courseId;
    }
    
    /**
     * @notice Add a module to a course
     */
    function addModule(
        uint256 courseId,
        string calldata title,
        string calldata description,
        bool isRequired
    ) external nonReentrant whenNotPaused returns (uint256) {  // CRITICAL FIX: Add pause protection
        Course storage course = courses[courseId];
        require(course.instructor == msg.sender, "Not course instructor");
        require(course.moduleCount < MAX_MODULES_PER_COURSE, "Max modules reached");
        require(bytes(title).length > 0 && bytes(title).length <= 200, "Invalid title");
        
        Module[] storage modules = courseModules[courseId];
        uint256 moduleId = (courseId * 1000) + modules.length + 1;
        
        Module memory newModule = Module({
            moduleId: moduleId,
            courseId: courseId,
            title: title,
            description: description,
            lessonCount: 0,
            orderIndex: modules.length,
            isRequired: isRequired
        });
        
        modules.push(newModule);
        course.moduleCount++;
        
        // CRITICAL FIX: Mark module as existing for validation
        moduleExists[moduleId] = true;
        
        emit ModuleAdded(courseId, moduleId, title);
        
        return moduleId;
    }
    
    /**
     * @notice Add a lesson to a module
     */
    function addLesson(
        uint256 moduleId,
        string calldata title,
        string calldata contentURI,
        uint256 estimatedMinutes
    ) external nonReentrant whenNotPaused returns (uint256) {  // CRITICAL FIX: Add pause protection
        // CRITICAL FIX: Verify module exists to prevent fabricated lessons
        require(moduleExists[moduleId], "Module does not exist");
        
        uint256 courseId = moduleId / 1000;
        Course storage course = courses[courseId];
        require(course.instructor == msg.sender, "Not course instructor");
        
        Lesson[] storage lessons = moduleLessons[moduleId];
        require(lessons.length < MAX_LESSONS_PER_MODULE, "Max lessons reached");
        require(bytes(title).length > 0 && bytes(title).length <= 200, "Invalid title");
        
        uint256 lessonId = (moduleId * 10000) + lessons.length + 1;
        
        Lesson memory newLesson = Lesson({
            lessonId: lessonId,
            moduleId: moduleId,
            title: title,
            contentURI: contentURI,
            orderIndex: lessons.length,
            estimatedMinutes: estimatedMinutes
        });
        
        lessons.push(newLesson);
        
        // CRITICAL FIX: Mark lesson as existing for validation
        lessonExists[lessonId] = true;
        
        // Update module lesson count and course total lessons
        Module[] storage modules = courseModules[courseId];
        for (uint256 i = 0; i < modules.length; i++) {
            if (modules[i].moduleId == moduleId) {
                modules[i].lessonCount++;
                break;
            }
        }
        
        // CRITICAL FIX: Update cached total lessons in course
        course.totalLessons++;
        
        emit LessonAdded(moduleId, lessonId, title);
        
        return lessonId;
    }
    
    /**
     * @notice Publish a course (make it active)
     */
    function publishCourse(uint256 courseId) external whenNotPaused {  // CRITICAL FIX: Add pause protection
        Course storage course = courses[courseId];
        require(course.instructor == msg.sender, "Not course instructor");
        require(course.status == CourseStatus.Draft, "Not in draft");
        require(course.moduleCount > 0, "No modules");
        
        course.status = CourseStatus.Active;
    }
    
    // ============================================
    // ENROLLMENT & PROGRESS
    // ============================================
    
    /**
     * @notice Enroll in a course
     */
    function enrollInCourse(uint256 courseId) external nonReentrant whenNotPaused {  // CRITICAL FIX: Add pause protection
        Course storage course = courses[courseId];
        require(course.status == CourseStatus.Active, "Course not active");
        require(enrollments[msg.sender][courseId].student == address(0), "Already enrolled");
        require(studentCourses[msg.sender].length < MAX_ENROLLMENTS_PER_USER, "Max enrollments reached");
        
        // CRITICAL FIX: Enforce max students per course
        require(courseStudents[courseId].length < MAX_STUDENTS_PER_COURSE, "Course full");
        
        Enrollment storage enrollment = enrollments[msg.sender][courseId];
        enrollment.student = msg.sender;
        enrollment.courseId = courseId;
        enrollment.enrolledAt = block.timestamp;
        enrollment.lastAccessedAt = block.timestamp;
        
        studentCourses[msg.sender].push(courseId);
        courseStudents[courseId].push(msg.sender);
        
        course.enrollmentCount++;
        instructors[course.instructor].studentCount++;
        totalEnrollments++;
        
        emit StudentEnrolled(msg.sender, courseId, block.timestamp);
    }
    
    /**
     * @notice Mark a lesson as completed
     */
    function completeLesson(
        uint256 lessonId,
        uint256 timeSpentMinutes
    ) external nonReentrant whenNotPaused {  // CRITICAL FIX: Add pause protection
        // CRITICAL FIX: Verify lesson exists to prevent fabricated progress
        require(lessonExists[lessonId], "Lesson does not exist");
        
        uint256 moduleId = lessonId / 10000;
        uint256 courseId = moduleId / 1000;
        
        require(enrollments[msg.sender][courseId].student != address(0), "Not enrolled");
        require(!lessonProgress[msg.sender][lessonId].isCompleted, "Already completed");
        
        LessonProgress storage progress = lessonProgress[msg.sender][lessonId];
        progress.lessonId = lessonId;
        progress.student = msg.sender;
        progress.isCompleted = true;
        progress.completedAt = block.timestamp;
        progress.timeSpentMinutes = timeSpentMinutes;
        
        studentCompletedLessons[msg.sender][courseId].push(lessonId);
        
        // Update enrollment progress
        _updateCourseProgress(msg.sender, courseId);
        
        emit LessonCompleted(msg.sender, lessonId, block.timestamp);
    }
    
    /**
     * @notice Update course progress percentage (CRITICAL FIX: Use cached total lessons)
     */
    function _updateCourseProgress(address student, uint256 courseId) private {
        // CRITICAL FIX: Use cached totalLessons instead of iteration
        uint256 totalLessons = courses[courseId].totalLessons;
        uint256 completedLessons = studentCompletedLessons[student][courseId].length;
        
        if (totalLessons > 0) {
            uint256 progressPercentage = (completedLessons * 100) / totalLessons;
            enrollments[student][courseId].progressPercentage = progressPercentage;
            enrollments[student][courseId].lastAccessedAt = block.timestamp;
            
            // Check if course is completed
            if (progressPercentage >= 100 && !enrollments[student][courseId].isCompleted) {
                enrollments[student][courseId].isCompleted = true;
                enrollments[student][courseId].completedAt = block.timestamp;
                courses[courseId].completionCount++;
                
                emit CourseCompleted(student, courseId, block.timestamp);
            }
        }
    }
    
    // ============================================
    // CERTIFICATIONS
    // ============================================
    
    /**
     * @notice Issue a certification to a student
     */
    function issueCertification(
        address recipient,
        uint256 courseId,
        CertificationType certificationType,
        string calldata credentialURI
    ) external onlyRole(CERTIFIER_ROLE) nonReentrant whenNotPaused returns (uint256) {  // CRITICAL FIX: Add pause protection
        require(enrollments[recipient][courseId].isCompleted, "Course not completed");
        require(bytes(credentialURI).length > 0, "Invalid credential URI");
        
        // CRITICAL FIX: Enforce max certifications per student
        require(studentCertifications[recipient].length < MAX_CERTIFICATIONS_PER_STUDENT, "Max certifications reached");
        
        totalCertifications++;
        uint256 certificationId = totalCertifications;
        
        Certification storage cert = certifications[certificationId];
        cert.certificationId = certificationId;
        cert.recipient = recipient;
        cert.courseId = courseId;
        cert.certificationType = certificationType;
        cert.credentialURI = credentialURI;
        cert.certifier = msg.sender;
        cert.issuedAt = block.timestamp;
        
        studentCertifications[recipient].push(certificationId);
        
        emit CertificationIssued(certificationId, recipient, courseId, certificationType);
        
        return certificationId;
    }
    
    /**
     * @notice Revoke a certification
     */
    function revokeCertification(uint256 certificationId) external onlyRole(CERTIFIER_ROLE) whenNotPaused {  // CRITICAL FIX: Add pause protection
        Certification storage cert = certifications[certificationId];
        require(!cert.isRevoked, "Already revoked");
        
        cert.isRevoked = true;
        
        emit CertificationRevoked(certificationId, msg.sender);
    }
    
    // ============================================
    // VIEW FUNCTIONS
    // ============================================
    
    function getCourse(uint256 courseId) external view returns (Course memory) {
        return courses[courseId];
    }
    
    function getCourseModules(uint256 courseId) external view returns (Module[] memory) {
        return courseModules[courseId];
    }
    
    function getModuleLessons(uint256 moduleId) external view returns (Lesson[] memory) {
        return moduleLessons[moduleId];
    }
    
    function getEnrollment(address student, uint256 courseId) external view returns (Enrollment memory) {
        return enrollments[student][courseId];
    }
    
    function getLessonProgress(address student, uint256 lessonId) external view returns (LessonProgress memory) {
        return lessonProgress[student][lessonId];
    }
    
    function getStudentCourses(address student) external view returns (uint256[] memory) {
        return studentCourses[student];
    }
    
    function getStudentCertifications(address student) external view returns (uint256[] memory) {
        return studentCertifications[student];
    }
    
    function getCertification(uint256 certificationId) external view returns (Certification memory) {
        return certifications[certificationId];
    }
    
    function getInstructor(address instructor) external view returns (Instructor memory) {
        return instructors[instructor];
    }
    
    function getInstructorCourses(address instructor) external view returns (uint256[] memory) {
        return instructorCourses[instructor];
    }
    
    // ============================================
    // ADMIN FUNCTIONS
    // ============================================
    
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }
    
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
}
