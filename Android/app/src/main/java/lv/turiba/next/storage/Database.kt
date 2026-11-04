package lv.turiba.next.storage

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Entity(primaryKeys = ["groupCode", "weekStart"])
data class WeekRecord(val groupCode: String, val weekStart: String, val weekEnd: String,
    val branch: String, val syncedAt: Long, val source: String, val warnings: String, val lessonCount: Int)
@Entity(primaryKeys = ["groupCode", "weekStart", "ordinal"])
data class LessonRecord(val groupCode: String, val weekStart: String, val ordinal: Int,
    val date: String, val startTime: String, val endTime: String, val subject: String,
    val room: String?, val period: Int, val sourceGroup: String, val subgroup: String?,
    val category: String, val type: String, val elective: Boolean, val requiresSelection: Boolean,
    val provisional: Boolean, val individualSchedule: Boolean, val deliveryModeUnspecified: Boolean,
    val changed: Boolean, val source: String)
@Entity data class GroupRecord(@PrimaryKey val code: String, val branch: String, val source: String, val syncedAt: Long)
@Entity data class SyncRecord(@PrimaryKey val groupCode: String, val attemptedAt: Long, val issue: String?, val verifiedWeeks: String)
@Entity data class WidgetRecord(@PrimaryKey val appWidgetId: Int, val groupCode: String)
@Entity data class Generation(@PrimaryKey val id: Int = 1, val value: Long = 0)
@Entity data class ReminderRecord(@PrimaryKey val id: String,val owner: String,val identity: String,
    val groupCode: String,val weekStart: String,val triggerAt: Long,val fingerprint: String,val body: String,
    val generation: Long,val delivered: Boolean=false)

@Dao abstract class ScheduleDao {
    @Query("SELECT * FROM WeekRecord WHERE groupCode=:group ORDER BY weekStart") abstract suspend fun weeks(group: String): List<WeekRecord>
    @Query("SELECT * FROM LessonRecord WHERE groupCode=:group AND weekStart=:week ORDER BY ordinal") abstract suspend fun lessons(group: String, week: String): List<LessonRecord>
    @Query("SELECT * FROM GroupRecord") abstract suspend fun catalog(): List<GroupRecord>
    @Query("SELECT * FROM SyncRecord WHERE groupCode=:group") abstract suspend fun sync(group: String): SyncRecord?
    @Query("SELECT * FROM WidgetRecord") abstract suspend fun widgets(): List<WidgetRecord>
    @Query("SELECT * FROM Generation WHERE id=1") abstract suspend fun generation(): Generation?
    @Query("SELECT * FROM ReminderRecord") abstract suspend fun reminders(): List<ReminderRecord>
    @Query("SELECT * FROM ReminderRecord WHERE id=:id") abstract suspend fun reminder(id: String): ReminderRecord?
    @Query("SELECT * FROM WeekRecord") abstract fun observeWeeks(): Flow<List<WeekRecord>>
    @Insert(onConflict = OnConflictStrategy.REPLACE) abstract suspend fun putWeek(record: WeekRecord)
    @Insert(onConflict = OnConflictStrategy.REPLACE) abstract suspend fun putLessons(records: List<LessonRecord>)
    @Insert(onConflict = OnConflictStrategy.REPLACE) abstract suspend fun putCatalog(records: List<GroupRecord>)
    @Insert(onConflict = OnConflictStrategy.REPLACE) abstract suspend fun putSync(record: SyncRecord)
    @Insert(onConflict = OnConflictStrategy.REPLACE) abstract suspend fun putWidget(record: WidgetRecord)
    @Insert(onConflict = OnConflictStrategy.REPLACE) abstract suspend fun putGeneration(record: Generation)
    @Insert(onConflict = OnConflictStrategy.REPLACE) abstract suspend fun putReminder(record: ReminderRecord)
    @Query("DELETE FROM ReminderRecord WHERE id=:id") abstract suspend fun removeReminder(id: String)
    @Query("DELETE FROM ReminderRecord") abstract suspend fun clearReminders()
    @Query("DELETE FROM LessonRecord WHERE groupCode=:group AND weekStart=:week") abstract suspend fun removeLessons(group: String, week: String)
    @Query("DELETE FROM WidgetRecord WHERE appWidgetId=:id") abstract suspend fun removeWidget(id: Int)
    @Query("DELETE FROM WeekRecord") abstract suspend fun clearWeeks()
    @Query("DELETE FROM LessonRecord") abstract suspend fun clearLessons()
    @Query("DELETE FROM GroupRecord") abstract suspend fun clearCatalog()
    @Query("DELETE FROM SyncRecord") abstract suspend fun clearSync()
    @Query("DELETE FROM WidgetRecord") abstract suspend fun clearWidgets()
    @Transaction open suspend fun replaceWeek(week: WeekRecord, lessons: List<LessonRecord>) {
        removeLessons(week.groupCode,week.weekStart); putWeek(week); putLessons(lessons)
    }
    @Transaction open suspend fun erase() {
        putGeneration(Generation(value=(generation()?.value ?: 0L) + 1L))
        clearLessons(); clearWeeks(); clearCatalog(); clearSync(); clearWidgets()
    }
}
@Database(entities=[WeekRecord::class,LessonRecord::class,GroupRecord::class,SyncRecord::class,WidgetRecord::class,Generation::class,ReminderRecord::class],version=2,exportSchema=true)
abstract class ScheduleDatabase : RoomDatabase() { abstract fun schedule(): ScheduleDao }

val MIGRATION_1_2=object: androidx.room.migration.Migration(1,2) {
    override fun migrate(db: androidx.sqlite.db.SupportSQLiteDatabase) {
        db.execSQL("CREATE TABLE IF NOT EXISTS `ReminderRecord` (`id` TEXT NOT NULL, `owner` TEXT NOT NULL, `identity` TEXT NOT NULL, `groupCode` TEXT NOT NULL, `weekStart` TEXT NOT NULL, `triggerAt` INTEGER NOT NULL, `fingerprint` TEXT NOT NULL, `body` TEXT NOT NULL, `generation` INTEGER NOT NULL, `delivered` INTEGER NOT NULL, PRIMARY KEY(`id`))")
    }
}
