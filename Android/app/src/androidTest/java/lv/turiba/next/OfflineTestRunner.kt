package lv.turiba.next

import android.app.Application
import android.content.Context
import androidx.test.runner.AndroidJUnitRunner

class OfflineTestApplication: NextApplication() { override val automaticRestore=false }
class OfflineTestRunner: UpgradeProbeRunner() {
    override fun newApplication(cl: ClassLoader,className: String,context: Context): Application =
        super.newApplication(cl,OfflineTestApplication::class.java.name,context)
}
